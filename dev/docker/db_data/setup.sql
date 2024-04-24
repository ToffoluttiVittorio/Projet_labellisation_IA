-- INSERTION DE DONNÉES DE TEST POUR LA TABLE user
INSERT INTO public.user (id,username,password) VALUES
(1,'lem','password'),
(2,'leh','1234');

-- INSERTION DE DONNÉES DE TEST POUR LA TABLE Chantier
INSERT INTO public.Chantier (id_style, code, nbr_image, stac_url, user_key, name) VALUES
(1, 1234, 5, 'https://exemple.com/chantier1',1,'région de Yzernay'),
(2, 1234, 5, 'https://exemple.com/chantier1',1,'région Cherbourg'),
(2, 5678, 3, 'https://exemple.com/chantier2',2,'Région parisienne');

-- INSERTION DE DONNÉES DE TEST POUR LA TABLE Image_sortie
INSERT INTO public.image_sortie (name, id_chantier,current_patch) VALUES
('https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/10/T/ES/2022/7/S2A_10TES_20220726_0_L2A/TCI.tif', 1, '{1, 2}'),
('https://storage.googleapis.com/open-cogs/stac-examples/20201211_223832_CS2.tif', 1,'{1, 2}');

-- INSERTION DE DONNÉES DE TEST POUR LA TABLE Patch
INSERT INTO public.patch (name, id_img_sortie, data, i, j) VALUES
('Patch1', 1, '{"key": "value"}', 0, 0),
('Patch2', 2, '{"key": "value"}', 0, 0);


-- INSERTION DE DONNÉES DE TEST POUR LA TABLE Catalogue 
INSERT INTO public.catalogue (name, data) VALUES
('Catalogue1', '{"key": "value"}'),
('Catalogue2', '{"key": "value"}');

-- INSERTION DE DONNÉES DE TEST POUR LA TABLE COG
INSERT INTO public.cog (name, data, id_catalogue) VALUES
('COG1', '{"key": "value"}', 1),
('COG2', '{"key": "value"}', 2);

