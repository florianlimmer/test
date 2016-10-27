// jshint evil:true
/////////////////////////////////////////////////////////////////
// Functions for FoLiA Processing, relies on foliaspec.js
/////////////////////////////////////////////////////////////////
//Map from folia classes to elements (not nested unlike foliaspec)
var foliaelements = {};

//Maps FoLiA XML tag to classes, FLAT works tag-based
var foliatag2class = {};

function folia_parse(element, ancestors) {
   /* Parse the generic foliaspec specification (created by foliaspec2json tool and stored in foliaspec.js) into something more manageable */
   if (element.class) {
    foliaelements[element.class] = element;
    if ((element.properties) && (element.properties.xmltag)) {
        foliatag2class[element.properties.xmltag] = element.class;
    }
    if (ancestors) {
        element.ancestors = ancestors; //ancestors are class based, not tag based
    } else {
        element.ancestors = [];
    }
   }
   if (element.elements) {
      var nextancestors;
      if (ancestors) {
          nextancestors = ancestors.slice(); //copy
      } else {
          nextancestors = [];
      } 
      if (element.class) {
          nextancestors.push(element.class);
      }
      for (var i = 0; i < element.elements.length; i++) {
          folia_parse(element.elements[i],nextancestors);
      }
   } 
}

function folia_label(tag, set) {
    //Get the human-readable label for an annotation type (corresponding to a FoLiA XML tag), if defined
    var foliaclass = foliatag2class[tag];

    if ((set) && (setdefinitions) && (setdefinitions[set]) && (setdefinitions[set].label)) {
        //Grab the label from the set definition
        return setdefinitions[set].label;
    }

    if ((foliaelements[foliaclass]) && (foliaelements[foliaclass].properties.label)) {
        return foliaelements[foliaclass].properties.label;
    } else {
        return tag; //fallback
    }
}

function folia_subset_label(set, subset) {
    if ((set) && (setdefinitions) && (setdefinitions[set]) && (setdefinitions[set].subsets) && (setdefinitions[set].subsets[subset])  && (setdefinitions[set].subsets[subset].label)) {
        return setdefinitions[set].subsets[subset].label;
    } else {
        return subset;
    }
}

function folia_feature_label(set, subset, cls) {
    if ((set) && (setdefinitions) && (setdefinitions[set]) && (setdefinitions[set].subsets) && (setdefinitions[set].subsets[subset])  && (setdefinitions[set].subsets[subset].classes[cls]) && (setdefinitions[set].subsets[subset].classes[cls].label)) {
        return setdefinitions[set].subsets[subset].classes[cls].label;
    } else {
        return subset;
    }
}

function folia_isspan(tag) {
    //Is the element a first order span element?
    var foliaclass = foliatag2class[tag];
    var found = false;
    for (var i = 0; i < foliaelements[foliaclass].ancestors.length; i++) {
        if (foliaelements[foliaclass].ancestors[i] == "AbstractSpanAnnotation") {
            found = true;
        }
        if (foliaelements[foliaclass].ancestors[i] == "AbstractSpanRole") {
            found = false; //not first-order
        }
    }
    return found;
 }

function folia_isspanrole(tag) {
    //Is the element a span role?
    var foliaclass = foliatag2class[tag];
    for (var i = 0; i < foliaelements[foliaclass].ancestors.length; i++) {
        if (foliaelements[foliaclass].ancestors[i] == "AbstractSpanRole") {
            return true;
        }
    }
    return false;
 }

function folia_isstructure(tag) {
    //Is the element a first order span element?
    var foliaclass = foliatag2class[tag];
    for (var i = 0; i < foliaelements[foliaclass].ancestors.length; i++) {
        if (foliaelements[foliaclass].ancestors[i] == "AbstractStructureElement") {
            return true;
        }
    }
    return false;
}


function folia_annotationlist() {
    /* Return a list (tagnames) of all elements */
    return Object.keys(foliatag2class);
}

function folia_structurelist() {
    /* Return a list (tagnames) of all structural elements */
    var structurelist = [];
    for (var tag in foliatag2class) {
        if (folia_isstructure(tag)) {
            structurelist.push(tag);
        }
    }
    return structurelist;
}

function folia_accepts_class(parentclass, childclass) {
    /* Is the child element accepted under the parent element?(elements correspond to classes)  */
    if ((foliaelements[parentclass]) && (foliaelements[parentclass].properties) && (foliaelements[parentclass].properties.accepted_data) && (foliaelements[parentclass].properties.accepted_data.indexOf(childclass) != -1)) {
        return true;
    } else if (foliaspec.defaultproperties.accepted_data.indexOf(childclass) != -1) {
        return true;
    } else if (foliaelements[parentclass]) {
        //check ancestor (will recurse by itself)
        if ((foliaelements[parentclass].ancestors) && (foliaelements[parentclass].ancestors.length > 0)) {
            if (folia_accepts_class(foliaelements[parentclass].ancestors[0], childclass)) {
                return true;
            }
        }
        
        //check if the parent element accepts an abstract class that is an ancestor of the child
        if ( (foliaelements[childclass].ancestors) && (foliaelements[parentclass].properties) && (foliaelements[parentclass].properties.accepted_data)) {
            for (var i = 0; i < foliaelements[childclass].ancestors.length; i++) {
                if (foliaelements[parentclass].properties.accepted_data.indexOf(foliaelements[childclass].ancestors[i]) != -1) {
                    return true;
                }
            }
        }
    }
    return false;
}

function folia_accepts(parenttag, childtag) {
    /* Is the child element accepted under the parent element? (elements correspond to tags) */
    if ((parenttag == 'w') && (folia_isspan(childtag))) {
        return true;
    } else {
        var parentclass = foliatag2class[parenttag];
        var childclass = foliatag2class[childtag];
        return folia_accepts_class(parentclass, childclass);
    }
}



function folia_spanroles(tag) {
    /* Collect all span annotation roles (tags) for the given span annotation element */
    var foliaclass = foliatag2class[tag];
    var spanroles = [];
    if ((foliaelements[foliaclass]) && (foliaelements[foliaclass].properties) && (foliaelements[foliaclass].properties.accepted_data)) {
        for (var i = 0; i < foliaelements[foliaclass].properties.accepted_data.length; i++) { //doesn't consider accepted_data inheritance but i don't think we use that in this case
            var childclass = foliaelements[foliaclass].properties.accepted_data[i];
            if (foliaelements[childclass].ancestors.indexOf('AbstractSpanRole') != -1) {
                spanroles.push(foliaelements[childclass].properties.xmltag);
            }
        }
    }
    return spanroles;
}

function folia_required_spanroles(tag) {
    /* Collect all mandatory span annotation roles (tags) for the given span annotation element */
    var foliaclass = foliatag2class[tag];
    var spanroles = [];
    if ((foliaelements[foliaclass]) && (foliaelements[foliaclass].properties) && (foliaelements[foliaclass].properties.required_data)) {
        for (var i = 0; i < foliaelements[foliaclass].properties.required_data.length; i++) { //doesn't consider accepted_data inheritance but i don't think we use that in this case
            var childclass = foliaelements[foliaclass].properties.required_data[i];
            if (foliaelements[childclass].ancestors.indexOf('AbstractSpanRole') != -1) {
                spanroles.push(foliaelements[childclass].properties.xmltag);
            }
        }
    }
    return spanroles;
}
