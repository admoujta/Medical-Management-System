# Decisions

## Produit

Le nom `FADAA Sante` est conserve: il est court, memorisable, bilingue-friendly et fonctionne pour un SaaS medical marocain.

## Direction artistique

Direction retenue: `Atlas Medical Dynamic`. Le design combine bleu petrole, teal medical lumineux, neutres chauds et photo editoriale. La photo n'est plus en fond global: elle devient un panneau dedie pour garder une interface professionnelle et lisible.

## Frontend

React + TypeScript + Vite + Tailwind CSS sont conserves. Framer Motion est ajoute pour des transitions de formulaire, progression animee, cartes de role et feedback visuel sans surcharger l'ecran.

## Multi-tenant

Strategie Phase 1: base PostgreSQL partagee avec `tenant_id` sur les donnees cabinet et dependency FastAPI pour imposer le tenant sur les endpoints metier. C'est le meilleur compromis vitesse de lancement, cout et migration future vers schema-par-cabinet.

## Roles

Le provisioning cree les roles par defaut `doctor_admin`, `clinic_manager`, `secretary`, `patient`, `platform_super_admin`. Le premier utilisateur choisit entre medecin admin, gestionnaire et secretaire; les autres roles existent pour la matrice de droits future.

## Cycle de vie

Essai gratuit de 30 jours avec periode de grace de 7 jours pour eviter une coupure trop brutale. Le worker APScheduler suspend automatiquement les tenants expires.

## Donnees metier futures

Un rendez-vous pourra exister sans honoraire pour les suivis gratuits. Un honoraire pourra exister sans rendez-vous pour un acte realise sur place. Les remboursements de paiement seront modelises comme mouvements negatifs lies au paiement original.
