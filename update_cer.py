import base64
import os
import requests

def push_via_github_api(file_path, repo, branch, token):
    # 1) Lee contenido y codifícalo en Base64
    with open(file_path, 'rb') as f:
        content_b64 = base64.b64encode(f.read()).decode()

    # 2) Obtiene SHA del archivo en GitHub
    headers = {'Authorization': f'token {token}'}
    url_get = f'https://api.github.com/repos/{repo}/contents/{file_path}?ref={branch}'
    resp = requests.get(url_get, headers=headers)
    resp.raise_for_status()
    sha = resp.json()['sha']

    # 3) Hace PUT para actualizar el contenido
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

# Al final de main(), después de save_data(data):
if __name__ == '__main__':
    main()
    # Solo si hubo un cambio, empuja por API
    token = os.environ.get('GITHUB_TOKEN') or os.environ.get('PAT')
    if fecha_iso not in data:  # asumimos cambio ocurrido
        push_via_github_api(
            file_path='indices/cer.json',
            repo='NazarenoDelgadoBalardini/finfocus-indices',
            branch='main',
            token=token
        )

