#!/usr/bin/env python
"""
Verifica installazione e funzionamento di tutte le componenti
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_imports():
    """Test che tutti i moduli si importino correttamente"""
    print("=" * 60)
    print("TEST 1: Importazione moduli")
    print("=" * 60)

    try:
        from app import create_app, db
        print("[OK] Flask app imports")

        from app.models.shared import User
        print("[OK] Models imports")

        from app.services.security_service import SecurityService
        print("[OK] Security service imports")

        from app.services.cache_service import CacheService
        print("[OK] Cache service imports")

        from app.services.image_optimizer import ImageOptimizer
        print("[OK] Image optimizer imports")

        from app.services.cdn_service import CDNService
        print("[OK] CDN service imports")

        print("\n[SUCCESS] Tutti i moduli importati correttamente!\n")
        return True
    except Exception as e:
        print(f"\n[ERROR] Errore importazione: {e}\n")
        return False


def test_app_creation():
    """Test creazione app"""
    print("=" * 60)
    print("TEST 2: Creazione applicazione")
    print("=" * 60)

    try:
        from app import create_app
        app = create_app('testing')
        print(f"[OK] App creata: {app.name}")
        print(f"[OK] Environment: {app.config.get('ENV', 'unknown')}")
        print(f"[OK] Debug: {app.debug}")

        print("\n[SUCCESS] Applicazione creata correttamente!\n")
        return True
    except Exception as e:
        print(f"\n[ERROR] Errore creazione app: {e}\n")
        return False


def test_database():
    """Test database connection"""
    print("=" * 60)
    print("TEST 3: Database")
    print("=" * 60)

    try:
        from app import create_app, db
        from app.models.shared import User

        app = create_app('testing')
        with app.app_context():
            # Create tables
            db.create_all()
            print("[OK] Tabelle create")

            # Create test user
            user = User(
                email='test@example.com',
                first_name='Test',
                last_name='User',
                role='trainer'
            )
            user.set_password('test123')
            db.session.add(user)
            db.session.commit()
            print("[OK] User creato")

            # Query user
            found = User.query.filter_by(email='test@example.com').first()
            assert found is not None
            print("[OK] User recuperato da database")

            # Check password
            assert found.check_password('test123')
            print("[OK] Password verificata")

            # Cleanup
            db.session.delete(found)
            db.session.commit()
            print("[OK] User eliminato")

        print("\n[SUCCESS] Database funzionante!\n")
        return True
    except Exception as e:
        print(f"\n[ERROR] Errore database: {e}\n")
        import traceback
        traceback.print_exc()
        return False


def test_security():
    """Test security services"""
    print("=" * 60)
    print("TEST 4: Security Services")
    print("=" * 60)

    try:
        from app.services.security_service import SecurityService

        # Test email validation
        assert SecurityService.validate_email('test@example.com')
        print("[OK] Email validation")

        # Test HTML sanitization
        dirty = '<script>alert("XSS")</script><p>Safe</p>'
        clean = SecurityService.sanitize_html(dirty)
        assert '<script>' not in clean
        assert '<p>' in clean
        print("[OK] HTML sanitization")

        # Test secure filename
        safe = SecurityService.secure_filename('../../etc/passwd')
        assert '..' not in safe
        print("[OK] Secure filename")

        print("\n[SUCCESS] Security services funzionanti!\n")
        return True
    except Exception as e:
        print(f"\n[ERROR] Errore security: {e}\n")
        return False


def test_cache():
    """Test caching"""
    print("=" * 60)
    print("TEST 5: Cache Service")
    print("=" * 60)

    try:
        from app import create_app, cache
        from app.services.cache_service import CacheService

        app = create_app('testing')
        with app.app_context():
            # Test cache key generation
            key = CacheService.get_cache_key('test', 123, action='view')
            assert 'test' in key
            print("[OK] Cache key generation")

            # Test cache set/get
            cache.set('test_key', 'test_value', timeout=60)
            value = cache.get('test_key')
            assert value == 'test_value'
            print("[OK] Cache set/get")

            # Test cache delete
            cache.delete('test_key')
            value = cache.get('test_key')
            assert value is None
            print("[OK] Cache delete")

        print("\n[SUCCESS] Cache service funzionante!\n")
        return True
    except Exception as e:
        print(f"\n[ERROR] Errore cache: {e}\n")
        return False


def test_rate_limiting():
    """Test rate limiting"""
    print("=" * 60)
    print("TEST 6: Rate Limiting")
    print("=" * 60)

    try:
        from app import create_app, limiter

        app = create_app('testing')
        print(f"[OK] Limiter configurato: {limiter.enabled}")
        print(f"[OK] Storage: {limiter._storage.__class__.__name__}")

        print("\n[SUCCESS] Rate limiting configurato!\n")
        return True
    except Exception as e:
        print(f"\n[ERROR] Errore rate limiting: {e}\n")
        return False


def main():
    """Run all tests"""
    print("\n")
    print("=" * 60)
    print(" " * 8 + "ATLAS PERFORMANCE - VERIFICA INSTALLAZIONE")
    print("=" * 60)
    print("\n")

    results = []

    results.append(("Importazione moduli", test_imports()))
    results.append(("Creazione app", test_app_creation()))
    results.append(("Database", test_database()))
    results.append(("Security", test_security()))
    results.append(("Cache", test_cache()))
    results.append(("Rate Limiting", test_rate_limiting()))

    # Summary
    print("\n")
    print("=" * 60)
    print("RIEPILOGO RISULTATI")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "[OK]" if result else "[FAIL]"
        print(f"{status} {test_name}")

    print("\n")
    print(f"Test passati: {passed}/{total}")

    if passed == total:
        print("\n[SUCCESS] TUTTI I TEST PASSATI! Sistema pronto per l'uso.\n")
        return 0
    else:
        print(f"\n[FAIL] {total - passed} test falliti. Controlla gli errori sopra.\n")
        return 1


if __name__ == '__main__':
    sys.exit(main())
