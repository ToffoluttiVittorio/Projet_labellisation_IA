-- INSERTION DE DONNÉES DE TEST POUR LA TABLE Chantier
INSERT INTO public.Chantier (ID_style, Code, Nbr_image, STAC_URL) VALUES
(1, 1234, 5, 'https://exemple.com/chantier1'),
(2, 5678, 3, 'https://exemple.com/chantier2');

-- INSERTION DE DONNÉES DE TEST POUR LA TABLE Image_sortie
INSERT INTO public.Image_sortie (Name, Data, ID_chantier) VALUES
('Image1', '{"key": "value"}', 1),
('Image2', '{"key": "value"}', 1),
('Image3', '{"key": "value"}', 2);

-- INSERTION DE DONNÉES DE TEST POUR LA TABLE Patch
INSERT INTO public.Patch (Name, ID_img_sortie, Data) VALUES
('Patch1', 1, '{"key": "value"}'),
('Patch2', 2, '{"key": "value"}'),
('Patch3', 3, '{"key": "value"}');

-- INSERTION DE DONNÉES DE TEST POUR LA TABLE Catalogue 
INSERT INTO public.Catalogue (Name, Data) VALUES
('Catalogue1', '{"key": "value"}'),
('Catalogue2', '{"key": "value"}');

-- INSERTION DE DONNÉES DE TEST POUR LA TABLE COG
INSERT INTO public.COG (Name, Data, ID_catalogue) VALUES
('COG1', '{"key": "value"}', 1),
('COG2', '{"key": "value"}', 2);
