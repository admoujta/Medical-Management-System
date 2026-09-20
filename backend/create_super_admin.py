import argparse
from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import Role, User

parser=argparse.ArgumentParser(description="Créer le Super Admin IRMA global")
parser.add_argument("--email",required=True)
parser.add_argument("--password",required=True)
parser.add_argument("--first-name",default="Admin")
parser.add_argument("--last-name",default="IRMA")
args=parser.parse_args()
if len(args.password)<12 or not any(c.isupper() for c in args.password) or not any(c.islower() for c in args.password) or not any(c.isdigit() for c in args.password):
    raise SystemExit("Le mot de passe doit contenir au moins 12 caractères, une majuscule, une minuscule et un chiffre.")
with SessionLocal() as db:
    if db.scalar(select(User).where(User.email==args.email)):
        raise SystemExit("Cet email existe déjà.")
    role=db.scalar(select(Role).where(Role.tenant_id.is_(None),Role.code=="platform_super_admin"))
    if not role:
        role=Role(tenant_id=None,code="platform_super_admin",name="SUPER_ADMIN_IRMA",description="Administration globale IRMA sans accès aux données médicales")
        db.add(role);db.flush()
    user=User(tenant_id=None,email=args.email,password_hash=hash_password(args.password),first_name=args.first_name,last_name=args.last_name,is_super_admin=True)
    db.add(user);db.flush();user.roles.append(role);db.commit()
    print(f"Super Admin IRMA créé : {args.email}")
