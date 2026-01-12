"""
Verifica che il Vite Build System sia configurato correttamente
"""
import os
import json
import sys

def check_file_exists(filepath, description):
    """Verifica che un file esista"""
    if os.path.exists(filepath):
        print(f"[OK] {description}: {filepath}")
        return True
    else:
        print(f"[FAIL] {description} non trovato: {filepath}")
        return False

def check_directory_exists(dirpath, description):
    """Verifica che una directory esista"""
    if os.path.isdir(dirpath):
        print(f"[OK] {description}: {dirpath}")
        return True
    else:
        print(f"[FAIL] {description} non trovata: {dirpath}")
        return False

def check_npm_dependencies():
    """Verifica che le dipendenze npm siano installate"""
    if not os.path.exists('package.json'):
        print("[FAIL] package.json non trovato")
        return False

    with open('package.json', 'r') as f:
        package_data = json.load(f)

    required_deps = ['alpinejs', 'chart.js']
    required_dev_deps = ['vite', 'tailwindcss', 'autoprefixer', 'postcss', 'terser']

    deps = package_data.get('dependencies', {})
    dev_deps = package_data.get('devDependencies', {})

    all_ok = True

    for dep in required_deps:
        if dep in deps:
            print(f"[OK] Dependency {dep}: {deps[dep]}")
        else:
            print(f"[FAIL] Dependency {dep} non trovata")
            all_ok = False

    for dep in required_dev_deps:
        if dep in dev_deps:
            print(f"[OK] DevDependency {dep}: {dev_deps[dep]}")
        else:
            print(f"[FAIL] DevDependency {dep} non trovata")
            all_ok = False

    return all_ok

def check_build_output():
    """Verifica che il build sia stato eseguito"""
    if not os.path.exists('dist'):
        print("[WARNING] Cartella dist/ non trovata - esegui 'npm run build'")
        return False

    if not os.path.exists('dist/manifest.json'):
        print("[WARNING] manifest.json non trovato in dist/ - esegui 'npm run build'")
        return False

    with open('dist/manifest.json', 'r') as f:
        manifest = json.load(f)

    print(f"[OK] Build manifest trovato con {len(manifest)} entries")

    # Verifica che ci siano i file principali
    has_js = any('main' in key and '.js' in key for key in manifest.keys())
    has_css = any('.css' in str(manifest.get(key, {}).get('file', '')) for key in manifest.keys())

    if has_js:
        print("[OK] JavaScript bundle trovato nel manifest")
    else:
        print("[WARNING] JavaScript bundle non trovato nel manifest")

    if has_css:
        print("[OK] CSS bundle trovato nel manifest")
    else:
        print("[WARNING] CSS bundle non trovato nel manifest")

    return has_js and has_css

def main():
    print("=" * 60)
    print("  Vite Build System - Verification Script")
    print("=" * 60)
    print()

    checks = []

    # Check configuration files
    print("\n[1/6] Checking configuration files...")
    checks.append(check_file_exists('package.json', 'package.json'))
    checks.append(check_file_exists('vite.config.js', 'vite.config.js'))
    checks.append(check_file_exists('tailwind.config.js', 'tailwind.config.js'))
    checks.append(check_file_exists('postcss.config.js', 'postcss.config.js'))

    # Check source directories
    print("\n[2/6] Checking source directories...")
    checks.append(check_directory_exists('app/static/src', 'Source directory'))
    checks.append(check_directory_exists('app/static/src/css', 'CSS source directory'))
    checks.append(check_directory_exists('app/static/src/js', 'JS source directory'))

    # Check source files
    print("\n[3/6] Checking source files...")
    checks.append(check_file_exists('app/static/src/css/main.css', 'CSS entry point'))
    checks.append(check_file_exists('app/static/src/js/main.js', 'JS entry point'))

    # Check Flask integration
    print("\n[4/6] Checking Flask integration...")
    checks.append(check_file_exists('app/utils/vite_helper.py', 'Vite helper'))
    checks.append(check_file_exists('app/templates/base_vite.html', 'Base template'))

    # Check npm dependencies
    print("\n[5/6] Checking npm dependencies...")
    checks.append(check_npm_dependencies())

    # Check build output (warning only)
    print("\n[6/6] Checking build output...")
    build_ok = check_build_output()
    if not build_ok:
        print("\n[INFO] Per generare il build esegui: npm run build")

    # Summary
    print("\n" + "=" * 60)
    print("  SUMMARY")
    print("=" * 60)

    passed = sum(checks)
    total = len(checks)

    print(f"\nChecks passed: {passed}/{total}")

    if all(checks):
        print("\n[SUCCESS] Vite Build System configurato correttamente!")
        if not build_ok:
            print("[INFO] Ricorda di eseguire 'npm run build' prima del deploy")
        return 0
    else:
        print("\n[ERROR] Alcuni check sono falliti. Vedi messaggi sopra.")
        return 1

if __name__ == '__main__':
    sys.exit(main())
