-- Conto del tavolo: «Chiudi conto» segna pagate le comande della seduta e apre una seduta nuova (QR chiuso).
alter table beachin.tavoli_qr add column if not exists seduta text;
alter table beachin.comande_sala
  add column if not exists seduta text,
  add column if not exists pagata boolean not null default false;
