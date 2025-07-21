#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup
import json
import os
from datetime import datetime

# URL de la página de BCRA con Principales Variables
BCRA_URL = 'https://www.bcra.gob.ar/PublicacionesEstadisticas/Principales_variables.asp'
# Ruta al archivo cer.json en tu repositorio
CER_JSON_PATH = os.path.join(os.path.dirname(__file__), 'indices', 'cer.json')


def fetch_cer_from_bcra():
    """Descarga la página del BCRA y extrae la fecha y el valor del CER más reciente."""
    resp = requests.get(BCRA_URL)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, 'html.parser')

    # Buscar la tabla que contiene principales variables (asumimos que hay una sóla)
    table = soup.find('table')
    if not table:
        raise RuntimeError('No se encontró ninguna tabla en la página de BCRA')

    for row in table.find_all('tr'):
        cols = [td.get_text(strip=True) for td in row.find_all('td')]
        # Se asume estructura: [Variable, Fecha, Valor]
        if len(cols) >= 3 and 'CER' in cols[0].upper():
            fecha_str = cols[1]  # ej. '31/07/2025'
            valor_str = cols[2]  # ej. '4,21'

            # Convertir fecha a ISO YYYY-MM-DD
            try:
                fecha_dt = datetime.strptime(fecha_str, '%d/%m/%Y')
            except ValueError:
                raise RuntimeError(f'Formato de fecha inesperado: {fecha_str}')
            fecha_iso = fecha_dt.strftime('%Y-%m-%d')

            # Convertir valor a float
            valor_num = float(valor_str.replace('.', '').replace(',', '.'))

            return fecha_iso, valor_num

    raise RuntimeError('No se encontró el valor de CER en la tabla')


def load_existing_data():
    """Carga cer.json como dict de fecha->valor."""
    if not os.path.exists(CER_JSON_PATH):
        return {}
    with open(CER_JSON_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_data(data):
    """Guarda el dict en cer.json con orden por fecha."""
    # Ordenar por clave
    ordered = {date: data[date] for date in sorted(data.keys())}
    with open(CER_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(ordered, f, ensure_ascii=False, indent=2)


def main():
    # 1) Obtener dato más reciente del BCRA
    fecha_iso, valor = fetch_cer_from_bcra()
    print(f'Dato CER extraído: {fecha_iso} -> {valor}')

    # 2) Cargar cer.json existente
    data = load_existing_data()
    print(f'Entradas actuales en cer.json: {len(data)}')

    # 3) Agregar si no existe
    if fecha_iso in data:
        print('La fecha ya existe en cer.json. Nada que hacer.')
        return

    data[fecha_iso] = valor
    save_data(data)
    print(f'Nuevo dato guardado en cer.json: {fecha_iso} -> {valor}')


if __name__ == '__main__':
    main()
