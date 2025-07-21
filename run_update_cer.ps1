# run_update_indices.ps1

# 1) Instalar dependencias (solo la primera vez o cuando cambies)
& 'C:\Program Files\Python313\python.exe' -m pip install --upgrade requests beautifulsoup4

# 2) Ejecutar los scripts de actualización
& 'C:\Program Files\Python313\python.exe' 'C:\Users\Usuario\Documents\finfocus-indices\update_cer.py'

Write-Host "✅ Actualización completada: $(Get-Date -Format o)"
