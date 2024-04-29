from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy.dialects.postgresql import JSONB, DOUBLE_PRECISION
from sqlalchemy import ARRAY

app = Flask(__name__)
CORS(app)
# Configure SQLAlchemy for the first database
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:postgres@localhost:8888/data'

# Configure SQLAlchemy for the second database
app.config['SQLALCHEMY_BINDS'] = {
    'db2': 'postgresql://postgres:postgres@localhost:9999/gestion'
}

db = SQLAlchemy(app)

################################## BDD DATA ##################################

class Chantier(db.Model):
    """
    Represents a chantier.

    Attributes:
        id (int): The unique identifier of the chantier.
        name (str): The name of the chantier.
        nomenclature (int): The nomenclature of the chantier.
        nbr_image (int): The number of images associated with the chantier.
        stac_url (str): The STAC URL of the chantier.
        createur (str): The ID of the user who created the chantier.
        annotateur (str): The ID of the user who annotated the chantier.
        reviewer (str): The ID of the user who reviewed the chantier.
        message (str): A message associated with the chantier.
        reviewed (bool): Indicates whether the chantier has been reviewed or not.

    Methods:
        to_dict(): Returns a dictionary representation of the chantier object.
    """
    __tablename__ = 'chantier'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255))
    nomenclature = db.Column(db.Integer) 
    nbr_image = db.Column(db.Integer, nullable=False)
    stac_url = db.Column(db.String(255), nullable=False)
    createur = db.Column(db.String(255), db.ForeignKey('user.id'), nullable=False)
    annotateur = db.Column(db.String(255), db.ForeignKey('user.id'), nullable=False)
    reviewer = db.Column(db.String(255), db.ForeignKey('user.id'), nullable=False)
    message = db.Column(db.String)
    reviewed = db.Column(db.Boolean, default=False)
    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

class User(db.Model):
    """
    Represents a user in the system.

    Attributes:
        id (int): The unique identifier for the user.
        username (str): The username of the user.
        password (str): The password of the user.
    """
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(255), nullable=False, unique=True)
    password = db.Column(db.String(255), nullable=False)

class Image_sortie(db.Model):
    """
    Represents an image sortie.

    Attributes:
        id (int): The unique identifier of the image sortie.
        name (str): The name of the image sortie.
        id_chantier (int): The foreign key referencing the associated chantier.
        current_patch (list[int]): The list of current patches.
    Methods:
        to_dict(): Returns a dictionary representation of the image sortie object.
    """
    __tablename__ = 'image_sortie'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    id_chantier = db.Column(db.Integer, db.ForeignKey('chantier.id'), nullable=False)
    current_patch = db.Column(ARRAY(db.Integer))

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

class Patch(db.Model):
    """
    Represents a patch in the system.

    Attributes:
        id (int): The unique identifier of the patch.
        name (str): The name of the patch.
        id_img_sortie (int): The foreign key referencing the associated image_sortie.
        data (JSONB): The data of the patch.
        i (int): The i-coordinate of the patch.
        j (int): The j-coordinate of the patch.
        segmentation_value (float): The segmentation value of the patch.
    Methods:
        to_dict(): Returns a dictionary representation of the patch object.
    """
    __tablename__ = 'patch'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    id_img_sortie = db.Column(db.Integer, db.ForeignKey('image_sortie.id'), nullable=False)
    data = db.Column(JSONB)
    i = db.Column(db.Integer)
    j = db.Column(db.Integer)
    segmentation_value = db.Column(DOUBLE_PRECISION)

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

class Catalogue(db.Model):
    """
    Represents a catalog entry in the database.

    Attributes:
        id (int): The unique identifier of the catalog entry.
        name (str): The name of the catalog entry.
        data (JSONB): The data associated with the catalog entry.
    """
    __tablename__ = 'catalogue'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    data = db.Column(JSONB, nullable=False)

class COG(db.Model):
    """
    Represents a COG (Cloud Optimized GeoTIFF) object.

    Attributes:
        id (int): The unique identifier of the COG.
        name (str): The name of the COG.
        data (dict): The data associated with the COG.
        id_catalogue (int): The ID of the catalogue that the COG belongs to.
    """
    __tablename__ = 'cog'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    data = db.Column(JSONB, nullable=False)
    id_catalogue = db.Column(db.Integer, db.ForeignKey('catalogue.id'), nullable=False)


@app.route('/data/chantier/getChantierInfo', methods=['GET'])
def get_chantier_info():
    """
    Retrieves information about a chantier based on the provided ID.

    Returns:
        dict: A dictionary containing the chantier information if found, or an error message if not found.
    """
    chantier_id = request.args.get('id')
    chantier = Chantier.query.get(chantier_id)
    if chantier:
        return {'chantier': chantier.to_dict()}
    else:
        return {'error': 'Chantier introuvable'}, 404

@app.route('/data/chantier', methods=['POST'])
def create_chantier():
    """
    Creates a new Chantier object based on the JSON data provided in the request.
    
    Returns:
        A dictionary containing the ID of the newly created Chantier object.
    """
    chantier = Chantier(**request.json)
    db.session.add(chantier)
    db.session.commit()
    return {'id': chantier.id}, 201

@app.route('/data/user/getChantier/createur/<username>', methods=['GET'])
def get_chantier_createur(username):
    """
    Retrieve the chantiers (projects) created by a given username.

    Args:
        username (str): The username of the user.

    Returns:
        dict: A dictionary containing the chantiers created by the user. If the user is not found, returns an error message with status code 404.

    """
    user = User.query.filter_by(username=username).first()
    if user:
        chantiers = Chantier.query.filter_by(createur=user.id).all()
        return {'chantier': [c.to_dict() for c in chantiers]}
    else:
        return {'error': 'Utilisateur introuvable'}, 404
        
@app.route('/data/user/getChantier/annotateur/<username>', methods=['GET'])
def get_chantier_annotateur(username):
    """
    Get chantiers associated with a specific annotateur.

    Args:
        username (str): The username of the annotateur.

    Returns:
        dict: A dictionary containing the list of chantiers associated with the annotateur.
              If the user is not found, returns an error message with status code 404.
    """
    user = User.query.filter_by(username=username).first()
    if user:
        chantiers = Chantier.query.filter_by(annotateur=user.id).all()
        return {'chantier': [c.to_dict() for c in chantiers]}
    else:
        return {'error': 'Utilisateur introuvable'}, 404

@app.route('/data/user/getChantier/reviewer/<username>', methods=['GET'])
def get_chantier_reviewer(username):
    """
    Retrieves the chantiers associated with a given reviewer's username.

    Args:
        username (str): The username of the reviewer.

    Returns:
        dict: A dictionary containing the retrieved chantiers as a list of dictionaries, or an error message with status code 404 if the user is not found.
    """
    user = User.query.filter_by(username=username).first()
    if user:
        chantiers = Chantier.query.filter_by(reviewer=user.id).all()
        return {'chantier': [c.to_dict() for c in chantiers]}
    else:
        return {'error': 'Utilisateur introuvable'}, 404



@app.route('/data/chantier/getImages', methods=['GET'])
def get_images():
    """
    Retrieves images from the database based on the provided 'id_chantier' parameter.

    Returns:
        dict: A dictionary containing a list of image dictionaries.
            Each image dictionary represents an image object with its attributes.
    """
    images = Image_sortie.query.filter_by(id_chantier=request.args.get('id_chantier')).all()
    return {'images': [i.to_dict() for i in images]}

@app.route('/data/image_sortie', methods=['POST'])
def create_image_sortie():
    """
    Creates a new image_sortie object and saves it to the database.

    Returns:
        A dictionary containing the ID of the newly created image_sortie object.
    """
    image_sortie = Image_sortie(**request.json)
    db.session.add(image_sortie)
    db.session.commit()
    return {'id': image_sortie.id}, 201

@app.route('/data/update_current_patch', methods=['POST'])
def update_current_patch():
    """
    Update the current patch of an Image_sortie object.

    This function retrieves an Image_sortie object based on the provided ID from the request JSON.
    It then updates the current_patch attribute of the Image_sortie object with the value provided in the request JSON.
    Finally, it commits the changes to the database and returns a response with the updated Image_sortie ID.

    Returns:
        dict: A dictionary containing the updated Image_sortie ID.

    Example:
        >>> request.json = {'id': 1, 'current_patch': 'patch_2'}
        >>> update_current_patch()
        {'id': 1}
    """
    image_sortie = Image_sortie.query.get(request.json.get('id'))
    image_sortie.current_patch = request.json.get('current_patch')
    db.session.commit()
    return {'id': image_sortie.id}, 201

@app.route('/data/patch', methods=['POST'])
def create_patch():
    """
    Creates a new patch object and adds it to the database.

    Returns:
        A dictionary containing the ID of the newly created patch and a status code of 201.
    """
    patch = Patch(**request.json)
    db.session.add(patch)
    db.session.commit()
    return {'id': patch.id}, 201

@app.route('/data/catalogue', methods=['POST'])
def create_catalogue():
    """
    Creates a new catalogue entry in the database.

    Returns:
        A dictionary containing the ID of the newly created catalogue entry.
    """
    catalogue = Catalogue(**request.json)
    db.session.add(catalogue)
    db.session.commit()
    return {'id': catalogue.id}, 201

@app.route('/data/cog', methods=['POST'])
def create_cog():
    """
    Creates a new COG object and saves it to the database.

    Returns:
        A dictionary containing the ID of the created COG object.
    """
    cog = COG(**request.json)
    db.session.add(cog)
    db.session.commit()
    return {'id': cog.id}, 201

@app.route('/data/user/getUser', methods=['GET'])
def get_users():
    """
    Retrieve all users from the database.

    Returns:
        dict: A dictionary containing user data, with keys 'users' and values as a list of dictionaries.
              Each dictionary in the list represents a user and contains 'id' and 'username' keys.
    """
    users = User.query.all()
    user_data = [{'id': user.id, 'username': user.username} for user in users]
    return {'users': user_data}
    

@app.route('/data/user/login', methods=['POST'])
def login():
    """
    Authenticates a user based on the provided username and password.

    Returns:
        A dictionary containing the authentication result and an HTTP status code.
    """
    data = request.json
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()
    if user:
        if user.password == password:
            return {'message': 'Connexion réussie'}, 200
        else:
            return {'error': 'Mot de passe incorrect'}, 401
    else:
        return {'error': 'Nom d\'utilisateur introuvable'}, 404
    
    
@app.route('/data/user/createUser', methods=['POST'])
def signup():
    """
    Create a new user account.

    This function receives a JSON payload containing the username and password of the new user.
    It checks if the username is already taken and returns an error message if it is.
    If the username is available, a new user account is created and saved to the database.

    Returns:
        A dictionary containing a success message if the user account was created successfully,
        or an error message if the username is already taken.

    Raises:
        None
    """
    data = request.json
    username = data.get('username')
    password = data.get('password')

    existing_user = User.query.filter_by(username=username).first()
    if existing_user:
        return {'message': 'Nom d\'utilisateur déjà pris'}, 400

    new_user = User(username=username, password=password)
    db.session.add(new_user)
    db.session.commit()

    return {'message': 'Utilisateur créé avec succès'}, 201

@app.route('/data/user/getUserId', methods=['GET'])
def get_user_id():
    """
    Retrieves the user ID based on the provided username.

    Returns:
        A dictionary containing the user ID if the user is found.
        If the username is not provided or the user is not found, an error message is returned.
    """
    username = request.args.get('username')
    if not username:
        return {'error': 'No username provided'}, 400
    
    user = User.query.filter_by(username=username).first()
    if not user:
        return {'error': 'User not found'}, 404

    return {'user_id': user.id}

@app.route('/data/user/getUserName', methods=['GET'])
def get_user_Name():
    """
    Retrieves the username of a user based on the provided id.

    Returns:
        A dictionary containing the user's username if the user is found.
        If no id is provided, returns an error message with status code 400.
        If the user is not found, returns an error message with status code 404.
    """
    id = request.args.get('id')
    if not id:
        return {'error': 'No id provided'}, 400
    
    user = User.query.filter_by(id=id).first()
    if not user:
        return {'error': 'User not found'}, 404

    return {'user_name': user.username}

@app.route('/data/chantier/delete', methods=['DELETE'])
def delete_chantier():
    """
    Delete a chantier and its associated images from the database.

    Returns:
        A dictionary containing the result of the deletion operation.
        If the chantier is successfully deleted, the dictionary will have a 'message' key with a success message and a 200 status code.
        If the chantier is not found, the dictionary will have an 'error' key with a 'Chantier introuvable' error message and a 404 status code.
        If the chantier ID is not provided, the dictionary will have an 'error' key with an 'ID du chantier non fourni' error message and a 400 status code.
    """
    chantier_id = request.args.get('id')
    if chantier_id:
        images = Image_sortie.query.filter_by(id_chantier=chantier_id).all()
        for image in images:
            db.session.delete(image)
       
        chantier = Chantier.query.get(chantier_id)
        if chantier:
            db.session.delete(chantier)
            db.session.commit()
            return {'message': 'Chantier supprimé avec succès'}, 200
        else:
            return {'error': 'Chantier introuvable'}, 404
    else:
        return {'error': 'ID du chantier non fourni'}, 400

@app.route('/save_patch', methods=['POST'])
def save_patch():
    """
    Saves a patch with the provided data.

    Parameters:
    - name (str): The name of the patch.
    - id_img_sortie (int): The ID of the output image.
    - geoJSON (str): The GeoJSON data representing the patch.
    - i (int): The i-coordinate of the patch.
    - j (int): The j-coordinate of the patch.
    - segmentation_value (float): The segmentation value of the patch.

    Returns:
    - str: A success message if the patch is saved successfully, or an error message if any required field is missing.

    """
    data = request.get_json()

    name = data.get('name')
    id_img_sortie = data.get('id_img_sortie')
    geoJSON = data.get('data')
    i = data.get('i')
    j = data.get('j')
    segmentation_value = data.get('segmentation_value')

    if not name or not id_img_sortie or not geoJSON or i is None or j is None:
        return "Error: All fields must be filled", 400

    patch = Patch.query.filter_by(id_img_sortie=id_img_sortie, i=i, j=j).first()

    if patch:
        # Patch exists, update data
        patch.data = geoJSON
        patch.segmentation_value = segmentation_value
    else:
        # Patch does not exist, create new
        patch = Patch(name=name, id_img_sortie=id_img_sortie, data=geoJSON, i=i, j=j, segmentation_value=segmentation_value)
        db.session.add(patch)

    db.session.commit()

    return "Success", 200

@app.route('/get_patches', methods=['GET'])
def get_patches():
    """
    Retrieve patches associated with a specific image ID.

    Returns:
        A JSON response containing a list of dictionaries representing the patches.
    """
    image_id = request.args.get('image_id')

    patches = Patch.query.filter_by(id_img_sortie=image_id).all()

    return jsonify([patch.to_dict() for patch in patches])
    
@app.route('/gestion/nomenclature/<int:id_chantier>', methods=['GET'])
def get_nomenclature_by_chantier_id(id_chantier):
        """
        Retrieve the nomenclature associated with a given chantier ID.

        Parameters:
        - id_chantier (int): The ID of the chantier.

        Returns:
        - JSON response: A JSON response containing the nomenclature if the chantier is found,
            or an error message with a 404 status code if the chantier is not found.
        """
        chantier = Chantier.query.filter_by(id=id_chantier).first()
        if chantier:
                return jsonify({'nomenclature': chantier.nomenclature})
        else:
                return jsonify({'error': 'Chantier non trouvé'}), 404


@app.route('/get_patch_by_name/<name>', methods=['GET'])
def get_patch_by_name(name):
    """
    Retrieve patches by name.

    Args:
        name (str): The name of the patch to retrieve.

    Returns:
        tuple: A tuple containing the JSON representation of the patches and the HTTP status code.
               If no patch is found with the given name, an error message and the HTTP status code 404 are returned.
    """
    patches = Patch.query.filter_by(name=name).all()

    if patches:
        # Convertir les objets Patch en dictionnaires pour pouvoir les renvoyer en JSON
        patches_dict = [patch.to_dict() for patch in patches]
        return jsonify(patches_dict), 200
    else:
        return "Error: No patch found with this name", 404

@app.route('/chantier/accepter', methods=['POST'])
def accepter_chantier():
    """
    Accepts a chantier by updating its message and reviewed status in the database.

    Returns:
        dict: A dictionary indicating the status of the operation.
    """
    data = request.get_json()
    chantier_id = data.get('chantier_id')
    message = data.get('message')
    chantier = Chantier.query.get(chantier_id)
    chantier.message = message
    chantier.reviewed = True
    db.session.commit()
    return {"status": "success"}

@app.route('/chantier/refuser', methods=['POST'])
def refuser_chantier():
    """
    Refuses a chantier.

    This function updates the message and reviewed status of a chantier
    identified by the given `chantier_id`. The `message` parameter is used to
    provide a reason for refusing the chantier. After updating the
    chantier, the changes are committed to the database.

    Returns:
        A dictionary with a "status" key indicating the success of the operation.
    """
    data = request.get_json()
    chantier_id = data.get('chantier_id')
    message = data.get('message')
    chantier = Chantier.query.get(chantier_id)
    chantier.message = message
    chantier.reviewed = False
    db.session.commit()
    return {"status": "success"}

@app.route('/chantier/review', methods=['GET'])
def get_chantier_review():
    """
    Retrieve the review message for a specific chantier.

    Returns:
        dict: A dictionary containing the review message.
    """
    chantier_id = request.args.get('chantier_id')
    chantier = Chantier.query.get(chantier_id)
    return {"message": chantier.message}

@app.route('/patch/segmentation_value', methods=['GET'])
def get_patch_segmentation_value():
    """
    Retrieves the segmentation value of a patch.

    Returns:
        A dictionary containing the segmentation value of the patch if found.
        If no patch is found with the given name, returns a dictionary with an error message and a 404 status code.
    """
    patch_name = request.args.get('patch_name')
    patch = Patch.query.filter_by(name=patch_name).first()
    if patch:
        return {"segmentation_value": patch.segmentation_value}
    else:
        return {"error": "No patch found with this name"}, 404

################################## BDD GESTION ##################################

class Nomenclature(db.Model):
    """
    Represents a nomenclature entry in the database.

    Attributes:
        id (int): The unique identifier for the nomenclature entry.
        nom (str): The name of the nomenclature entry.
    """
    __bind_key__ = 'db2'
    __tablename__ = 'nomenclature'
    id = db.Column(db.Integer, primary_key=True)
    nom = db.Column(db.String(255), nullable=False)

class Style(db.Model):
    """
    Represents a style in the database.

    Attributes:
        id (int): The unique identifier of the style.
        nomenclature (int): The foreign key referencing the associated nomenclature.
        nom (str): The name of the style.
        couleur (str): The color of the style.
    """
    __bind_key__ = 'db2'
    __tablename__ = 'style'
    id = db.Column(db.Integer, primary_key=True)
    nomenclature = db.Column(db.Integer, db.ForeignKey('nomenclature.id'))
    nom = db.Column(db.String(255), nullable=False)
    couleur = db.Column(db.String(255), nullable=False)

@app.route('/gestion/nomenclature', methods=['POST'])
def create_nomenclature():
    """
    Create a new nomenclature with the provided name and fields.

    Returns:
        A dictionary containing the ID of the created nomenclature and a status code of 201.
    """
    nom = request.json['nom']
    champs = request.json['champs']
    
    nomenclature = Nomenclature(nom=nom)
    db.session.add(nomenclature)
    db.session.commit()
    
    for champ, couleur in champs:
        style = Style(nomenclature=nomenclature.id, nom=champ, couleur=couleur)
        db.session.add(style)
    db.session.commit()

    return {'id': nomenclature.id}, 201
    
@app.route('/gestion/nomenclatures', methods=['GET'])
def get_nomenclatures_and_styles():
    """
    Retrieves all nomenclatures and their associated styles from the database.

    Returns:
        A JSON response containing a list of nomenclatures with their styles.
    """
    nomenclatures = Nomenclature.query.all()
    nomenclatures_with_styles = []
    for nomenclature in nomenclatures:
        styles = Style.query.filter_by(nomenclature=nomenclature.id).all()
        styles_json = [{'id': style.id, 'nom': style.nom, 'couleur': style.couleur} for style in styles]
        nomenclature_json = {'id': nomenclature.id, 'nom': nomenclature.nom, 'styles': styles_json}
        nomenclatures_with_styles.append(nomenclature_json)
    return jsonify(nomenclatures_with_styles)
    
@app.route('/gestion/nomenclature/<int:id>/styles', methods=['GET'])
def get_styles_by_nomenclature(id):
    """
    Retrieve styles by nomenclature ID.

    Args:
        id (int): The ID of the nomenclature.

    Returns:
        tuple: A tuple containing the serialized styles as a JSON response and the HTTP status code.
               If no styles are found for the given nomenclature, a JSON response with a message and
               a 404 status code is returned.
    """
    styles = Style.query.filter_by(nomenclature=id).all()
    if styles:
        serialized_styles = [{'id': style.id, 'nom': style.nom, 'couleur': style.couleur} for style in styles]
        return jsonify({'styles': serialized_styles}), 200
    else:
        return jsonify({'message': 'Aucun style trouvé pour cette nomenclature'}), 404


if __name__ == '__main__':
    app.run(debug=True)
