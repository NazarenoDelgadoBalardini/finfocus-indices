#!/usr/bin/env python3
"""
Script para actualizar indices/activa.json
Extrae T.N.A. (30 días) desde la web del BNA, obtiene la fecha de vigencia,
calcula la tasa mensual, y genera entradas diarias desde la última fecha existente
(o desde la fecha de vigencia) hasta hoy, aplicando la tasa compuesta diaria.
Luego sube vía API.
"""
import requests
from bs4 import BeautifulSoup
import json
import os
from datetime import datetime, timedelta
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

    # 2) buscar la fecha de vigencia previa en el flujo de texto
    date_pattern = re.compile(r"(\d{1,2}/\d{1,2}/\d{4})")
    texts = list(soup.stripped_strings)
    fecha_vig = None
    if tna_elem in texts:
        idx = texts.index(tna_elem)
        for prev in reversed(texts[:idx]):
            mdate = date_pattern.search(prev)
            if mdate:
                fecha_vig = datetime.strptime(mdate.group(1), '%d/%m/%Y')
                break
    if not fecha_vig:
        raise RuntimeError('No se encontró la fecha de vigencia asociada')

    # 3) calcular tasa mensual y tasa diaria equivalente
    annual = float(percent_str.replace('.', '').replace(',', '.'))
    monthly = (annual / 365.0) * 30.0
    # tasa diaria simple equivalente (aproximación): mensual/30
    daily_rate = monthly / 30.0
    return fecha_vig.date(), daily_rate


def load_data():
    if not os.path.exists(ACTIVA_JSON_PATH):
        return {}
    with open(ACTIVA_JSON_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_data(data):
    ordered = {date: data[date] for date in sorted(data.keys())}
    with open(ACTIVA_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(ordered, f, ensure_ascii=False, indent=2)


def push_via_github_api(file_path, repo, branch, token):
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
    # Extraer fecha de vigencia y tasa diaria
    fecha_vig, daily_rate = fetch_monthly_rate_and_date()
    print(f'Fecha de vigencia BNA: {fecha_vig}, tasa diaria: {daily_rate*100:.6f}%')

    # Cargar datos existentes
    data = load_data()
    # Identificar última fecha en JSON
    fechas = [datetime.strptime(d, '%Y-%m-%d').date() for d in data.keys()]
    last_date = max(fechas) if fechas else None
    # Decide punto de inicio
    start_date = last_date + timedelta(days=1) if last_date and last_date >= fecha_vig else fecha_vig

    # No hay nuevas fechas si ya llegó hasta hoy
    today = datetime.today().date()
    if start_date > today:
        print('No hay fechas nuevas para agregar.')
        return False

    # Iterar del start_date hasta hoy
    prev_val = data.get(last_date.strftime('%Y-%m-%d'), 100.0)
    new = False
    d = start_date
    while d <= today:
        key = d.strftime('%Y-%m-%d')
        if key not in data:
            prev_val = prev_val * (1 + daily_rate)
            data[key] = prev_val
            print(f'Agregado {key} -> {prev_val:.6f}')
            new = True
        d += timedelta(days=1)

    if not new:
        print('Todas las fechas ya están presentes.')
        return False

    save_data(data)
    # Empujar cambios
    token = os.environ.get('PAT')
    if not token:
        raise RuntimeError('Variable PAT no definida')
    push_via_github_api('indices/activa.json', REPO, BRANCH, token)
    return True


if __name__ == '__main__':
    main()
