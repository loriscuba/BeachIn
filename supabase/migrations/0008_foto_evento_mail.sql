-- Mail clienti con grafica: la richiesta evento porta l'URL pubblico della foto dell'evento (nella testata della mail).
alter table beachin.richieste_eventi add column if not exists evento_foto text;
