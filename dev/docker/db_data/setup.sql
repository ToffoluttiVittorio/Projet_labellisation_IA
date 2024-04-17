-- -- INSERTION DE DONNÉES DE TEST POUR LA TABLE Chantier
-- INSERT INTO public.Chantier (id_style, code, nbr_image, stac_url) VALUES
-- (1, 1234, 5, 'https://exemple.com/chantier1'),
-- (2, 5678, 3, 'https://exemple.com/chantier2');

-- -- INSERTION DE DONNÉES DE TEST POUR LA TABLE Image_sortie
-- INSERT INTO public.image_sortie (name, , id_chantier) VALUES
-- ('Image1', '{"key": "value"}', 1),
-- ('Image2', '{"key": "value"}', 1),
-- ('Image3', '{"key": "value"}', 2);

-- -- INSERTION DE DONNÉES DE TEST POUR LA TABLE Patch
-- INSERT INTO public.patch (name, id_img_sortie, data) VALUES
-- ('Patch1', 1, '{"key": "value"}'),
-- ('Patch2', 2, '{"key": "value"}'),
-- ('Patch3', 3, '{"key": "value"}');

-- INSERTION DE DONNÉES DE TEST POUR LA TABLE Catalogue 
INSERT INTO public.catalogue (name, data) VALUES
('Catalogue1', '{"key": "value"}'),
('Catalogue2', '{"key": "value"}');

-- INSERTION DE DONNÉES DE TEST POUR LA TABLE COG
INSERT INTO public.cog (name, data, id_catalogue) VALUES
('COG1', '{"key": "value"}', 1),
('COG2', '{"key": "value"}', 2);
