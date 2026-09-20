"""super admin SaaS plans and global settings

Revision ID: 20260718_0034
Revises: 20260717_0033
"""
from alembic import op
import sqlalchemy as sa

revision = "20260718_0034"
down_revision = "20260717_0033"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if "subscription_plans" not in inspector.get_table_names():
        op.create_table("subscription_plans", sa.Column("id",sa.String(36),primary_key=True),sa.Column("name",sa.String(120),nullable=False,unique=True),sa.Column("price",sa.Numeric(12,2),nullable=False),sa.Column("duration_months",sa.Integer(),nullable=False,server_default="1"),sa.Column("features",sa.JSON(),nullable=False,server_default="[]"),sa.Column("is_active",sa.Boolean(),nullable=False,server_default=sa.true()),sa.Column("created_at",sa.DateTime(timezone=True),server_default=sa.func.now()),sa.Column("updated_at",sa.DateTime(timezone=True),server_default=sa.func.now()))
    if "platform_settings" not in inspector.get_table_names():
        op.create_table("platform_settings",sa.Column("id",sa.String(36),primary_key=True),sa.Column("trial_days",sa.Integer(),nullable=False,server_default="30"),sa.Column("reminder_days",sa.JSON(),nullable=False,server_default="[7,3,1]"),sa.Column("reminder_message",sa.Text(),nullable=False,server_default="Votre abonnement FADAA Santé arrive bientôt à expiration."),sa.Column("maintenance_mode",sa.Boolean(),nullable=False,server_default=sa.false()),sa.Column("support_email",sa.String(255)),sa.Column("terms_url",sa.String(500)),sa.Column("privacy_url",sa.String(500)),sa.Column("updated_at",sa.DateTime(timezone=True),server_default=sa.func.now()))
        op.execute("INSERT INTO platform_settings (id) VALUES ('global')")
    columns={item["name"] for item in sa.inspect(op.get_bind()).get_columns("subscriptions")}
    if "plan_id" not in columns: op.add_column("subscriptions",sa.Column("plan_id",sa.String(36),sa.ForeignKey("subscription_plans.id",ondelete="SET NULL")))
    if "payment_method" not in columns: op.add_column("subscriptions",sa.Column("payment_method",sa.String(60)))
    if "next_due_date" not in columns: op.add_column("subscriptions",sa.Column("next_due_date",sa.DateTime(timezone=True)))
    indexes={item["name"] for item in sa.inspect(op.get_bind()).get_indexes("subscriptions")}
    if "ix_subscriptions_plan_id" not in indexes: op.create_index("ix_subscriptions_plan_id","subscriptions",["plan_id"])
    plans=sa.table("subscription_plans",sa.column("id",sa.String),sa.column("name",sa.String),sa.column("price",sa.Numeric),sa.column("duration_months",sa.Integer),sa.column("features",sa.JSON),sa.column("is_active",sa.Boolean))
    op.bulk_insert(plans,[{"id":"plan-essential","name":"Essentiel","price":299,"duration_months":1,"features":["Patients","Agenda","Facturation","Documents"],"is_active":True},{"id":"plan-professional","name":"Professionnel","price":499,"duration_months":1,"features":["Toutes les fonctions Essentiel","Secrétaires","CNSS","Relances"],"is_active":True}])


def downgrade() -> None:
    op.drop_index("ix_subscriptions_plan_id",table_name="subscriptions")
    for column in ("next_due_date","payment_method","plan_id"):op.drop_column("subscriptions",column)
    op.drop_table("platform_settings");op.drop_table("subscription_plans")
