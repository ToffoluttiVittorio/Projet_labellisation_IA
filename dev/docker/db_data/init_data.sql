-- use postgis to manipule geometries
CREATE EXTENSION IF NOT EXISTS postgis;


-- ------------------------------------------------------------------ --
-- --  Tables and constraints                                      -- --
-- ------------------------------------------------------------------ --

CREATE TABLE public.Chantier (
    ID SERIAL PRIMARY KEY,
    ID_style INT NOT NULL,
    Code INT NOT NULL,
    Nbr_image INT NOT NULL,
    STAC_URL VARCHAR(255) NOT NULL
);

ALTER TABLE IF EXISTS public.Chantier
	OWNER to postgres;

CREATE TABLE public.Image_sortie (
    ID SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Data JSONB,
    ID_chantier INT NOT NULL,
    FOREIGN KEY (ID_chantier) REFERENCES Chantier(ID)
);

ALTER TABLE IF EXISTS public.Image_sortie
	OWNER to postgres;

CREATE TABLE public.Patch (
    ID SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    ID_img_sortie INT NOT NULL,
    Data JSONB NOT NULL,
    FOREIGN KEY (ID_img_sortie) REFERENCES Image_sortie(ID)
);

ALTER TABLE IF EXISTS public.Patch
	OWNER to postgres;

CREATE TABLE public.Catalogue (
    ID SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Data JSON NOT NULL
);

ALTER TABLE IF EXISTS public.Catalogue
	OWNER to postgres;

CREATE TABLE public.COG (
    ID SERIAL PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Data JSON NOT NULL,
    ID_catalogue INT NOT NULL,
    FOREIGN KEY (ID_catalogue) REFERENCES Catalogue(ID)
);

ALTER TABLE IF EXISTS public.COG
	OWNER to postgres;
