#!/usr/bin/env python3

"""
Script para actualizar indices/cer.json y subirlo vía la API de GitHub.
"""

import requests
from bs4 import BeautifulSoup
import json
import os
from datetime import datetime
import base64

# Deshabilita warnings de SSL (self-hosted runner)
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configuración
BCRA_URL = 'https://www.bcra.gob.ar/PublicacionesEstadisticas/Principales_variables.asp'
CER_JSON_PATH = os.path.join(os.path.dirname(__file__), 'indices', 'cer.json')
REPO = 'NazarenoDelgadoBalardini/finfocus-indices'
BRANCH = 'main'

def fetch_cer_from_bcra():
    resp = requests.get(BCRA_URL, verify=False)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, 'html.parser')

    table = soup.find('table')
    if not table:
        raise RuntimeError('No se encontró la tabla de Principales Variables')

    for row in table.find_all('tr'):
        cols = [td.get_text(strip=True) for td in row.find_all('td')]
        if len(cols) >= 3 and 'CER' in cols[0].upper():
            fecha_dt = datetime.strptime(cols[1], '%d/%m/%Y')
            fecha_iso = fecha_dt.strftime('%Y-%m-%d')
            valor_num = float(cols[2].replace('.', '').replace(',', '.'))
            return fecha_iso, valor_num

    raise RuntimeError('No se encontró el valor de CER en la página')

def load_existing_data():
    if not os.path.exists(CER_JSON_PATH):
        return {}
    with open(CER_JSON_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_data(data):
    ordered = {date: data[date] for date in sorted(data.keys())}
    with open(CER_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(ordered, f, ensure_ascii=False, indent=2)

def push_via_github_api(file_path, repo, branch, token):
    # Prepara contenido en Base64
    with open(file_path, 'rb') as f:
        content_b64 = base64.b64encode(f.read()).decode()

    headers = {'Authorization': f'token {token}'}
    # Obtén SHA del archivo existente
    url_get = f'https://api.github.com/repos/{repo}/contents/{file_path}?ref={branch}'
    r1 = requests.get(url_get, headers=headers)
    r1.raise_for_status()
    sha = r1.json()['sha']

    # Haz PUT para actualizar
    url_put = f'https://api.github.com/repos/{repo}/contents/{file_path}'
    payload = {
        "message": "Actualiza CER index",
        "content": content_b64,
        "sha": sha,
        "branch": branch
    }
    r2 = requests.put(url_put, json=payload, headers=headers)
    r2.raise_for_status()
    print("✅ Push via API completado")

def main():
    # 1) Extrae CER
    fecha_iso, valor = fetch_cer_from_bcra()
    print(f'CER extraído: {fecha_iso} -> {valor}')

    # 2) Carga y chequea
    data = load_existing_data()
    print(f'Entradas actuales: {len(data)}')
    if fecha_iso in data:
        print('La fecha ya existe. No hay cambios.')
        return False

    # 3) Guarda nuevo dato
    data[fecha_iso] = valor
    save_data(data)
    print(f'Guardado nuevo CER: {fecha_iso} -> {valor}')
    return True

if __name__ == '__main__':
    changed = main()
    if changed:
        # Usa PAT inyectado en tu workflow como secreto
        token = os.environ.get('PAT')
        if not token:
            raise RuntimeError('No se encontró el token en la variable PAT')
        push_via_github_api(
            file_path='indices/cer.json',
            repo=REPO,
            branch=BRANCH,
            token=token
        )
