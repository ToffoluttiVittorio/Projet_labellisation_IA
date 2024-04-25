-- use postgis to manipule geometries
CREATE EXTENSION IF NOT EXISTS postgis;


-- ------------------------------------------------------------------ --
-- --  Tables and constraints                                      -- --
-- ------------------------------------------------------------------ --


CREATE TABLE public.nomenclature (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL
);

ALTER TABLE IF EXISTS public.nomenclature
	OWNER to postgres;

CREATE TABLE public.style (
    nomenclature INT,
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    couleur VARCHAR(255) NOT NULL,
    FOREIGN KEY (nomenclature) REFERENCES "nomenclature"(id)
);

ALTER TABLE IF EXISTS public.style
	OWNER to postgres;
