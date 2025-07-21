#!/usr/bin/env python3
"""
Script para actualizar indices/activa.json
Extrae T.N.A. (30 días) desde la web del BNA, obtiene la fecha de vigencia,
calcula la tasa mensual, la aplica al último valor del índice y guarda el nuevo valor,
luego sube vía API.
"""

import requests
from bs4 import BeautifulSoup
import json
import os
from datetime import datetime
import base64
import re
import urllib3

# Deshabilita warnings de SSL en entornos self-hosted
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configuración
BNA_URL = 'https://www.bna.com.ar/Home/InformacionAlUsuarioFinanciero'
ACTIVA_JSON_PATH = os.path.join(os.path.dirname(__file__), 'indices', 'activa.json')
REPO = 'NazarenoDelgadoBalardini/finfocus-indices'
BRANCH = 'main'


def fetch_monthly_rate_and_date():
    """Extrae fecha de vigencia y T.N.A. (30 días), devuelve (fecha_iso, tasa_mensual)."""
    resp = requests.get(BNA_URL, verify=False)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, 'html.parser')

    # 1) localizar el texto de T.N.A.
    tna_elem = soup.find(string=re.compile(r"T\.N\.A\..*?=\s*[0-9]+,[0-9]+%"))
    if not tna_elem:
        raise RuntimeError('No se encontró el valor de T.N.A. (30 días)')
    mval = re.search(r"=\s*([0-9]+,[0-9]+)%", tna_elem)
    percent_str = mval.group(1)

    # 2) buscar fecha previa a ese elemento en el flujo de texto
    date_pattern = re.compile(r"(\d{1,2}/\d{1,2}/\d{4})")
    texts = list(soup.stripped_strings)
    fecha_vig = None
    if tna_elem in texts:
        idx = texts.index(tna_elem)
        for prev in reversed(texts[:idx]):
            mdate = date_pattern.search(prev)
            if mdate:
                fecha_vig = datetime.strptime(mdate.group(1), '%d/%m/%Y').strftime('%Y-%m-%d')
                break
    if not fecha_vig:
        raise RuntimeError('No se encontró la fecha de vigencia asociada')

    # 3) calcular tasa mensual
    annual = float(percent_str.replace('.', '').replace(',', '.'))
    monthly = (annual / 365.0) * 30.0
    return fecha_vig, monthly


def load_data():
    """Carga activa.json como dict de fecha->valor."""
    if not os.path.exists(ACTIVA_JSON_PATH):
        return {}
    with open(ACTIVA_JSON_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_data(data):
    """Guarda el dict ordenado en activa.json."""
    ordered = {date: data[date] for date in sorted(data.keys())}
    with open(ACTIVA_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(ordered, f, ensure_ascii=False, indent=2)


def push_via_github_api(file_path, repo, branch, token):
    """Actualiza el archivo en GitHub vía API usando el token."""
    with open(file_path, 'rb') as f:
        content_b64 = base64.b64encode(f.read()).decode()
    headers = {'Authorization': f'token {token}'}
    url_get = f'https://api.github.com/repos/{repo}/contents/{file_path}?ref={branch}'
    r1 = requests.get(url_get, headers=headers)
    r1.raise_for_status()
    sha = r1.json()['sha']
    url_put = f'https://api.github.com/repos/{repo}/contents/{file_path}'
    payload = {
        'message': 'Actualiza Activa index',
        'content': content_b64,
        'sha': sha,
        'branch': branch
    }
    r2 = requests.put(url_put, json=payload, headers=headers)
    r2.raise_for_status()
    print('✅ Push Activa via API completado')


def main():
    fecha_iso, monthly = fetch_monthly_rate_and_date()
    print(f'Fecha de vigencia: {fecha_iso}, tasa mensual: {monthly:.6f}%')

    data = load_data()
    last_val = data.get(sorted(data.keys())[-1], 100.0)
    new_val = last_val * (1 + monthly / 100)

    if fecha_iso in data:
        print(f'Ya existe entrada para fecha {fecha_iso}. No hay cambios.')
        return False
    data[fecha_iso] = new_val
    save_data(data)
    print(f'Guardado {fecha_iso} -> {new_val:.6f}')
    return True


if __name__ == '__main__':
    changed = main()
    if changed:
        token = os.environ.get('PAT')
        if not token:
            raise RuntimeError('Variable PAT no definida')
        push_via_github_api('indices/activa.json', REPO, BRANCH, token)
