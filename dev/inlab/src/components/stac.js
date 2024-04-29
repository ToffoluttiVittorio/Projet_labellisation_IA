/* Copyright 2018 GravityLab LLC, David Hemphill */
import $ from "jquery";

export class Node {
  constructor(url, rootNode, parentNode, entry) {
    this.url = url;
    this.rootNode = rootNode;
    this.parentNode = parentNode;
    this.entry = entry;
    this.children = [];
  }

  getEntry() {
    return this.entry;
  }

  computeUrlBase() {
    var r = /[^\/]*$/;
    return this.url.replace(r, "");
  }

  computeAbsoluteUrl(href) {
    if (href.indexOf("//") >= 0) {
      return href; //is already absolute
    } else {
      return this.computeUrlBase() + href; //generate absolute path
    }
  }

  fetchChildNode(link) {
    var dataObj = null;

    if ("child" == link.rel) {
      dataObj = new Catalog();
    } else if ("item" == link.rel) {
      dataObj = new Item();
    } else {
      /* TODO, how to handle 'alternate' or other rel extensions ? */
      dataObj = new Catalog();
    }

    var fullUrl = this.computeAbsoluteUrl(link.href);

    var rtnstatus;
    var rtnexception;

    $.ajax({
      url: fullUrl,
      type: "GET",
      crossDomain: true,
      async: false,
      dataType: "text",
      success: function (data) {
        var obj = JSON.parse(data);
        dataObj.fromJson(obj);
      },
      error: function (xhr, status, exception) {
        rtnstatus = status;
        rtnexception = exception;
        return false;
      },
    });

    if (null != rtnstatus || null != rtnexception) {
      throw "Unable to read node: " + status + " " + exception;
    }

    var node = new Node(fullUrl, this.rootNode, this, dataObj);
    node.entry = dataObj;
    this.children.push(node);
    return node;
  }
}

export class Index {
  constructor() {
    this.rootNode = null;
  }

  getRootNode() {
    return this.rootNode;
  }

  initialize(rootCatalogUrl) {
    var idx = this;
    var rcurl = rootCatalogUrl;
    var rootNode = null;

    var rtnstatus;
    var rtnexception;

    $.ajax({
      url: rcurl,
      type: "GET",
      crossDomain: true,
      async: false,
      dataType:
        "text" /* had to set so response is not parsed and causing errors */,
      success: function (data) {
        var obj = JSON.parse(data);
        var rc = new RootCatalog();
        rc.fromJson(obj);
        rootNode = new Node(rcurl, null, null, rc);
      },
      error: function (xhr, status, exception) {
        rtnstatus = status;
        rtnexception = exception;
        return false;
      },
    });

    if (null != rtnstatus || null != rtnexception) {
      throw "Unable to read catalog: " + rtnstatus + " " + rtnexception;
    }

    this.rootNode = rootNode;
  }
}

/*************** Model Objects ***************************/

/** Root catalog, contains contact info, licensing, etc. */

export class RootCatalog {
  constructor() {
    this.name = "";
    this.description = "";
    this.links = [];
    this.license = {
      name: "",
      short_name: "",
      link: "",
      copyright: "",
    };
    this.contact = {
      name: "",
      organization: "",
      email: "",
      url: "",
    };
    this.keywords = "";
    this.homepage = "";
    this.provider = {
      scheme: "",
      region: "",
      requesterPays: "",
    };
  }

  findLink(href) {
    var rtn = null;
    $.each(this.links, function (idx, value) {
      if (href == value.href) {
        rtn = value;
        return false;
      }
    });

    return rtn;
  }

  fromJson(json) {
    if ("name" in json) {
      this.name = json.name;
    }
    if ("description" in json) {
      this.description = json.description;
    }
    if ("links" in json) {
      var arr = this.links;
      $.each(json.links, function (idx, value) {
        var link = new Link();
        link.fromJson(value);
        arr.push(link);
      });
    }
    if ("license" in json) {
      this.license = json.license;
    }
    if ("contact" in json) {
      this.contact = json.contact;
    }
    if ("keywords" in json) {
      this.keywords = json.keywords;
    }
    if ("homepage" in json) {
      this.homepage = json.homepage;
    }
    if ("provider" in json) {
      this.provider = json.provider;
    }
  }

  isValid() {
    return this.name != "" && this.description != "" && this.links.length > 0;
  }
}

/** Link Catalog */

export class Catalog {
  constructor() {
    this.name = "";
    this.description = "";
    this.links = [];
  }

  fromJson(json) {
    if ("name" in json) {
      this.name = json.name;
    }
    if ("description" in json) {
      this.description = json.description;
    }
    if ("links" in json) {
      this.links = json.links;
    }
  }

  findLink(href) {
    var rtn = null;
    $.each(this.links, function (idx, value) {
      if (href == value.href) {
        rtn = value;
        return false;
      }
    });

    return rtn;
  }

  isValid() {
    return this.name != "" && this.description != "" && this.links.length > 0;
  }
}

export class Link {
  constructor() {
    this.rel = null;
    this.href = null;
  }

  fromJson(json) {
    if ("rel" in json) {
      this.rel = json.rel;
    }
    if ("href" in json) {
      this.href = json.href;
    }
  }

  isValid() {
    return this.rel != "" && this.href != "";
  }
}

export class Asset {
  constructor() {
    this.type;
    this.name;
    this.href;
  }

  fromJson(json) {
    if ("type" in json) {
      this.type = json.type;
    }
    if ("name" in json) {
      this.name = json.name;
    }
    if ("href" in json) {
      this.href = json.href;
    }
  }

  isValid() {
    return this.type != "" && this.name != "" && this.href != "";
  }
}

export class Geometry {
  constructor() {
    this.type = [];
    this.coordinates = [];
  }

  fromJson(json) {
    if ("type" in json) {
      this.type = json.type;
    }
    if ("coordinates" in json) {
      this.coordinates = json.coordinates;
    }
  }
}

export class Item {
  constructor() {
    this.type = null;
    this.id = null;
    this.bbox = null;
    this.geometry = null;
    this.properties = [];
    this.links = [];
    this.assets = [];
  }

  fromJson(json) {
    if ("type" in json) {
      this.type = json.type;
    }
    if ("id" in json) {
      this.id = json.id;
    }
    if ("bbox" in json) {
      this.bbox = json.bbox;
    }
    if ("geometry" in json) {
      this.geometry = new Geometry();
      this.geometry.fromJson(json.geometry);
    }
    if ("properties" in json) {
      this.properties = json.properties;
    }
    if ("links" in json) {
      var arr = this.links;
      $.each(json.links, function (idx, value) {
        var link = new Link();
        link.fromJson(value);
        arr.push(link);
      });
    }
    if ("assets" in json) {
      var arr = this.assets;
      $.each(json.assets, function (idx, value) {
        var asset = new Asset();
        asset.fromJson(value);
        arr.push(asset);
      });
    }
  }
}
