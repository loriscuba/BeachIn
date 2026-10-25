-- Tablet self con menu Lavagnetta (ott 2026): ogni voce dice se va in cucina o al bar.
alter table beachin.lavagnetta add column if not exists reparto text not null default 'cucina';
