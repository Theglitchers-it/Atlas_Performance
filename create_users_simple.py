"""
Script to create default users for Atlas Performance
Run this when MySQL is running (when the Flask app is running)
"""
from werkzeug.security import generate_password_hash

# Generate password hashes
admin_hash = generate_password_hash('Admin123!')
trainer_hash = generate_password_hash('Trainer123!')

print("="*60)
print("DEFAULT USERS - SQL INSERT STATEMENTS")
print("="*60)
print("\nRun these SQL commands when MySQL is running:\n")

print("-- Super Admin User")
print(f"INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, tenant_id, created_at, updated_at)")
print(f"VALUES ('admin@atlas.com', '{admin_hash}', 'Super', 'Admin', 'super_admin', 1, NULL, NOW(), NOW());")

print("\n-- Trainer User")
print(f"INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, tenant_id, created_at, updated_at)")
print(f"VALUES ('trainer@atlas.com', '{trainer_hash}', 'Demo', 'Trainer', 'trainer', 1, NULL, NOW(), NOW());")

print("\n" + "="*60)
print("LOGIN CREDENTIALS:")
print("="*60)
print("Super Admin: admin@atlas.com / Admin123!")
print("Trainer:     trainer@atlas.com / Trainer123!")
print("="*60)
