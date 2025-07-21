#!/usr/bin/env python3

"""
Script para actualizar el archivo indices/cer.json con el último valor de CER
obtenido desde la página del BCRA.
"""

import requests
import urllib3
from bs4 import BeautifulSoup
import json
import os
from datetime import datetime

# Deshabilita warnings de SSL por verify=False
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# URL de la página de BCRA con Principales Variables
BCRA_URL = 'https://www.bcra.gob.ar/PublicacionesEstadisticas/Principales_variables.asp'
# Ruta al archivo cer.json en tu repositorio
CER_JSON_PATH = os.path.join(os.path.dirname(__file__), 'indices', 'cer.json')


def fetch_cer_from_bcra():
    """Descarga la página del BCRA y extrae la fecha y el valor del CER más reciente."""
    resp = requests.get(BCRA_URL, verify=False)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, 'html.parser')

    table = soup.find('table')
    if not table:
        raise RuntimeError('No se encontró la tabla de Principales Variables')

    for row in table.find_all('tr'):
        cols = [td.get_text(strip=True) for td in row.find_all('td')]
        if len(cols) >= 3 and 'CER' in cols[0].upper():
            fecha_str = cols[1]  # e.g. '31/07/2025'
            valor_str = cols[2]  # e.g. '4,21'

            fecha_dt = datetime.strptime(fecha_str, '%d/%m/%Y')
            fecha_iso = fecha_dt.strftime('%Y-%m-%d')

            valor_num = float(valor_str.replace('.', '').replace(',', '.'))

            return fecha_iso, valor_num

    raise RuntimeError('No se encontró el valor de CER en la página')


def load_existing_data():
    """Carga cer.json como dict de fecha->valor."""
    if not os.path.exists(CER_JSON_PATH):
        return {}
    with open(CER_JSON_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_data(data):
    """Guarda el dict en cer.json con orden de fechas."""
    ordered = {date: data[date] for date in sorted(data.keys())}
    with open(CER_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(ordered, f, ensure_ascii=False, indent=2)


def main():
    fecha_iso, valor = fetch_cer_from_bcra()
    print(f'CER extraído: {fecha_iso} -> {valor}')

    data = load_existing_data()
    print(f'Entradas actuales: {len(data)}')

    if fecha_iso in data:
        print('La fecha ya existe. No se realizan cambios.')
        return

    data[fecha_iso] = valor
    save_data(data)
    print(f'Guardado nuevo CER: {fecha_iso} -> {valor}')


if __name__ == '__main__':
    main()
