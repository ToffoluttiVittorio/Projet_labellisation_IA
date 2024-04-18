from flask import Flask, render_template, request, redirect, url_for
import os
from werkzeug.utils import secure_filename
import numpy as np
import rasterio
from rasterio.windows import Window

app = Flask(__name__)

# Dossier où les fichiers seront téléchargés
UPLOAD_FOLDER = './data'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Dossier où les patchs seront sauvegardés
PATCH_FOLDER = './output'
app.config['PATCH_FOLDER'] = PATCH_FOLDER

# Crée le dossier de sortie s'il n'existe pas
os.makedirs(app.config['PATCH_FOLDER'], exist_ok=True)

# Extensions de fichiers autorisées
ALLOWED_EXTENSIONS = {'tif', 'tiff'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def patch_image(input_file, output_dir, patch_size):
    # Crée le dossier de sortie s'il n'existe pas
    os.makedirs(output_dir, exist_ok=True)

    # Crée un sous-dossier pour les patchs de cette image
    image_id = os.path.splitext(os.path.basename(input_file))[0]
    patch_folder = os.path.join(output_dir, f"{image_id}_{patch_size}")
    os.makedirs(patch_folder, exist_ok=True)

    with rasterio.open(input_file) as src:
        rows = src.height // patch_size
        cols = src.width // patch_size

        for row in range(rows):
            for col in range(cols):
                window = Window(col * patch_size, row * patch_size, patch_size, patch_size)
                patch = src.read(window=window)
                patch_name = f"{os.path.splitext(os.path.basename(input_file))[0]}_patch_size_{patch_size}_patch_{row * cols + col + 1}.tif"
                patch_output = os.path.join(patch_folder, patch_name)  # Change output_dir to patch_folder
                with rasterio.open(patch_output, 'w', driver='GTiff', width=patch_size, height=patch_size, count=src.count, dtype=src.dtypes[0], crs=src.crs, transform=src.window_transform(window)) as dst:
                    dst.write(patch)

@app.route('/', methods=['GET', 'POST'])
def upload_file():
    if request.method == 'POST':
        # Vérifie si le fichier est correctement envoyé
        if 'file' not in request.files:
            flash('Aucun fichier n\'a été sélectionné')
            return redirect(request.url)
        file = request.files['file']
        # Si l'utilisateur n'a pas sélectionné de fichier, le navigateur envoie une chaîne vide sans nom de fichier
        if file.filename == '':
            flash('Aucun fichier n\'a été sélectionné')
            return redirect(request.url)
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            # Crée le dossier d'upload s'il n'existe pas
            os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

            # Utilise la fonction patch_image pour traiter le fichier GeoTIFF
            input_file = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            output_dir = app.config['PATCH_FOLDER']
            patch_size = int(request.form.get('patch_size'))
            patch_image(input_file, output_dir, patch_size)

            # Redirige vers une page indiquant que le traitement est terminé
            return redirect(url_for('result', filename=filename))
    return render_template('upload.html')

@app.route('/result/<filename>')
def result(filename):
    # Affiche une page avec le nom du fichier traité
    return f'<h1>Le fichier {filename} a été traité avec succès!</h1>'

if __name__ == '__main__':
    app.run(debug=True)
