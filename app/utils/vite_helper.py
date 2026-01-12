"""
Vite Asset Helper
Integra Vite build system con Flask
"""
import json
import os
from flask import current_app, url_for
from functools import lru_cache


class ViteAssetHelper:
    """Helper per caricare asset da Vite manifest"""

    def __init__(self, app=None):
        self.app = app
        self.manifest = None
        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        """Inizializza l'helper con l'app Flask"""
        self.app = app

        # Registra template helper
        app.jinja_env.globals['vite_asset'] = self.vite_asset
        app.jinja_env.globals['vite_hmr'] = self.vite_hmr

        # Carica manifest in produzione
        if not app.config.get('DEBUG', False):
            self.load_manifest()

    def load_manifest(self):
        """Carica il manifest.json generato da Vite"""
        manifest_path = os.path.join(
            self.app.root_path,
            '..',
            'dist',
            'manifest.json'
        )

        try:
            with open(manifest_path, 'r') as f:
                self.manifest = json.load(f)
        except FileNotFoundError:
            self.app.logger.warning(
                f'Vite manifest not found at {manifest_path}. '
                'Run "npm run build" to generate production assets.'
            )
            self.manifest = {}
        except json.JSONDecodeError:
            self.app.logger.error(f'Invalid JSON in Vite manifest: {manifest_path}')
            self.manifest = {}

    @lru_cache(maxsize=128)
    def vite_asset(self, entry_point):
        """
        Ritorna l'URL dell'asset buildato da Vite

        In sviluppo: ritorna l'URL del dev server Vite
        In produzione: ritorna l'URL dall'asset manifest

        Args:
            entry_point: Nome dell'entry point (es. 'main.js', 'styles.css')

        Returns:
            str: URL completo dell'asset
        """
        # Development mode - usa Vite dev server
        if current_app.config.get('DEBUG', False):
            vite_dev_server = current_app.config.get('VITE_DEV_SERVER_URL', 'http://localhost:5173')
            return f"{vite_dev_server}/{entry_point}"

        # Production mode - usa manifest
        if self.manifest is None:
            self.load_manifest()

        if not self.manifest:
            current_app.logger.warning(
                f'Vite manifest empty, returning fallback URL for {entry_point}'
            )
            return url_for('static', filename=f'dist/{entry_point}')

        # Cerca entry point nel manifest
        entry_key = f'js/{entry_point}' if not entry_point.startswith('css/') else entry_point

        if entry_key not in self.manifest and entry_point not in self.manifest:
            # Prova senza js/ prefix
            for key in self.manifest:
                if key.endswith(entry_point):
                    entry_key = key
                    break

        manifest_entry = self.manifest.get(entry_key) or self.manifest.get(entry_point)

        if not manifest_entry:
            current_app.logger.warning(
                f'Entry point {entry_point} not found in Vite manifest'
            )
            return url_for('static', filename=f'dist/{entry_point}')

        # Ritorna il file buildato
        asset_file = manifest_entry.get('file')
        if not asset_file:
            return url_for('static', filename=f'dist/{entry_point}')

        return url_for('static', filename=f'../dist/{asset_file}')

    def vite_hmr(self):
        """
        Ritorna il tag script per Vite HMR (Hot Module Replacement)
        Solo in development mode
        """
        if not current_app.config.get('DEBUG', False):
            return ''

        vite_dev_server = current_app.config.get('VITE_DEV_SERVER_URL', 'http://localhost:5173')

        return f'''
        <script type="module">
            import RefreshRuntime from '{vite_dev_server}/@react-refresh'
            RefreshRuntime.injectIntoGlobalHook(window)
            window.$RefreshReg$ = () => {{}}
            window.$RefreshSig$ = () => (type) => type
            window.__vite_plugin_react_preamble_installed__ = true
        </script>
        <script type="module" src="{vite_dev_server}/@vite/client"></script>
        '''

    def get_css_assets(self, entry_point):
        """
        Ritorna tutti i file CSS associati ad un entry point

        Args:
            entry_point: Nome dell'entry point

        Returns:
            list: Lista di URL CSS
        """
        if current_app.config.get('DEBUG', False):
            # In dev mode Vite inietta CSS automaticamente
            return []

        if self.manifest is None:
            self.load_manifest()

        if not self.manifest:
            return []

        manifest_entry = self.manifest.get(entry_point)
        if not manifest_entry:
            return []

        css_files = manifest_entry.get('css', [])
        return [url_for('static', filename=f'../dist/{css}') for css in css_files]


# Global instance
vite_helper = ViteAssetHelper()


def init_vite(app):
    """Inizializza Vite helper nell'app Flask"""
    vite_helper.init_app(app)
    return vite_helper
