#target photoshop

'use strict';

app.preferences.rulerUnits = Units.PIXELS;
app["bringToFront"]();
var scriptFolder;
try {
  scriptFolder = File($.fileName).parent;
}
catch (e) {
  scriptFolder = Folder.current;
}

function getDefaultFolder(folderName) {
  return new Folder(scriptFolder.fsName + "/" + folderName);
}

var templatePath = getDefaultFolder("PTS");
var outputFolderPath = getDefaultFolder("Result");
var designFolderPath = getDefaultFolder("Design");
var designList;

var fileTypes = new RegExp(/\.(jpg|tif|psd|jpeg|gif|png|ai|eps)$/i);
var exportOptions = new ExportOptionsSaveForWeb;
exportOptions["quality"] = 10;
exportOptions["PNG8"] = false;
exportOptions.transparency = false; 
exportOptions.interlaced = false; 

app.preferences.rulerUnits = Units.PIXELS;

var dialog = new Window("dialog");
dialog.title = "Edit Design";
dialog.preferredSize.width = 500;
dialog.preferredSize.height = 500;
dialog.alignChildren = ["left", "top"];
dialog.spacing = 10;
dialog.margins = 16;
var group1 = dialog.add("group", undefined, {
  "name" : "group1"
});
group1.preferredSize.width = 500;
group1.orientation = "column";
group1.alignChildren = ["fill", "top"];
group1.spacing = 10;
group1.margins = 0;

//template panel
var templatePanel = group1.add("panel", undefined, undefined, {
  "name" : "templatePanel"
});
templatePanel.text = "Template Folder";
templatePanel.orientation = "column";
templatePanel.alignChildren = ["left", "top"];
templatePanel.spacing = 10;
templatePanel.margins = 10;
var templateEditText = templatePanel.add("edittext {properties: {name: \"edittext1\"}}//edittext {properties: {name: \"edittext1\"}}");
templateEditText.preferredSize.width = 450;
var templateButton = templatePanel.add("button", undefined, undefined, {
  "name" : "templateButton"
});
templateButton.text = "Browse...";
templateButton["onClick"] = function() {
  var selectedFolder = Folder.selectDialog("Select the psd template folder");
  if (selectedFolder) {
    templatePath = selectedFolder;
    templateEditText.text = selectedFolder.fsName;
  }
};

//Design panel
var designPanel = group1.add("panel", undefined, undefined, {
  "name" : "templatePanel"
});
designPanel.text = "Design Folder";
designPanel.orientation = "column";
designPanel.alignChildren = ["left", "top"];
designPanel.spacing = 10;
designPanel.margins = 10;
var designEditText = designPanel.add("edittext {properties: {name: \"edittext1\"}}//edittext {properties: {name: \"edittext1\"}}");
designEditText.preferredSize.width = 450;
var designButton = designPanel.add("button", undefined, undefined, {
  "name" : "designButton"
});
designButton.text = "Browse...";
designButton["onClick"] = function() {
  var selectedFolder = Folder.selectDialog("Select the Design folder ");
  if (selectedFolder) {
    designFolderPath = selectedFolder;
    designEditText.text = selectedFolder.fsName;
  }
};

//Result panel
var resultPanel = group1.add("panel", undefined, undefined, {
  "name" : "templatePanel"
});
resultPanel.text = "Result Folder";
resultPanel.orientation = "column";
resultPanel.alignChildren = ["left", "top"];
resultPanel.spacing = 10;
resultPanel.margins = 10;
var resultEditText = resultPanel.add("edittext {properties: {name: \"edittext1\"}}//edittext {properties: {name: \"edittext1\"}}");
resultEditText.preferredSize.width = 450;
var resultButton = resultPanel.add("button", undefined, undefined, {
  "name" : "resultButton"
});
resultButton.text = "Browse...";
resultButton["onClick"] = function() {
  var selectedFolder = Folder.selectDialog("Select the result folder ");
  if (selectedFolder) {
    outputFolderPath = selectedFolder;
    resultEditText.text = selectedFolder.fsName;
  }
};

templateEditText.text = templatePath.fsName;
designEditText.text = designFolderPath.fsName;
resultEditText.text = outputFolderPath.fsName;

var group2 = dialog.add("group", undefined, {
  "name" : "group2"
});
group2.orientation = "row";
group2.alignChildren = ["left", "center"];
group2.spacing = 10;
group2.margins = 0;
var panel5 = group2.add("panel", undefined, undefined, {
  "name" : "panel5 "
});
panel5.orientation = "row";
panel5.alignChildren = ["left", "top"];
panel5.spacing = 10;
panel5.margins = 10;
var button4 = panel5.add("button", undefined, undefined, {
  "name" : "button4"
});
button4.text = "Oke";

button4["onClick"] = function() {
  dialog.close();
  main();
};
var button5 = panel5.add("button", undefined, undefined, {
  "name" : "button5"
});
button5.text = "Cancel";
button5["onClick"] = function() {
  dialog.close();
  return;
};
try {
  dialog["show"]();
}
catch (e) {
  reportScriptError(e, "dialog.show");
}

function main() {
  try {
    if (!templatePath || !templatePath.exists) {
      alert("Template Folder is not selected");
      return;
    }

    if (!designFolderPath || !designFolderPath.exists) {
      alert("Design Folder is not selected");
      return;
    }

    if (!outputFolderPath || !outputFolderPath.exists) {
      alert("Result Folder is not selected");
      return;
    }

    designList = designFolderPath.getFiles(fileTypes);
    if (designList.length == 0) {
      alert("Design is not found");
      return;
    }

    var templateList = templatePath.getFiles(new RegExp(/\.(psd)$/i));
    if (templateList.length == 0) {
      alert("PSD file is not found");
      return;
    }

    var designPairsResult = buildDesignPairs(designList);
    if (!designPairsResult.ok) {
      alert(designPairsResult.error);
      return;
    }

    var designGroupsResult = splitDesignPairsEvenly(designPairsResult.pairs, templateList.length);
    if (!designGroupsResult.ok) {
      alert(designGroupsResult.error);
      return;
    }

    for (var templateIndex = 0; templateIndex < templateList.length; templateIndex++) {
      var assignedDesignPairs = designGroupsResult.groups[templateIndex];
      if (!assignedDesignPairs || assignedDesignPairs.length == 0) {
        continue;
      }

      if (!processTemplate(templateList[templateIndex], assignedDesignPairs)) {
        return;
      }
    }  
  }
  catch (e) {
    reportScriptError(e, "main");
    return;
  }  
}

function processTemplate(template, designPairs) {
  var templateDoc;
  try {
    open(template);
    templateDoc = app.activeDocument;

    var smartObjects = findLayers(app.activeDocument, true, {
      typename: "ArtLayer",
      kind: LayerKind.SMARTOBJECT,
    });

    if (smartObjects.length === 0) {
      alert("Didn't find any Smart Layer");
      closeDocumentNoSave(templateDoc);
      return false;
    }
    
    var designLayer;
    for (var i = 0; i < smartObjects.length; i++ ) {
      var mySmartLayer = smartObjects[i];
      if (mySmartLayer.name == "Design") {
        designLayer = mySmartLayer;
      }
    }

    if (!designLayer) {
      if (smartObjects.length == 1) {
        designLayer = smartObjects[0];
      } else {
        alert("Design Layer is not found");
        closeDocumentNoSave(templateDoc);
        return false;
      }
    }

    for (var designIndex = 0; designIndex < designPairs.length; designIndex++) {
      var designPair = designPairs[designIndex];
      var designName = designPair.designName;

      if (!applyRandomBackgroundSelection(templateDoc)) {
        closeDocumentNoSave(templateDoc);
        return false;
      }

      app.activeDocument.activeLayer = designLayer;
      if (!editContents(designPair.designFile, designLayer)) {
        closeDocumentNoSave(templateDoc);
        return false;
      }

      var outputFilePath = outputFolderPath + "/" + designName + ".jpeg";
      app.activeDocument.exportDocument(new File(outputFilePath), ExportType["SAVEFORWEB"], exportOptions);
    }
    closeDocumentNoSave(templateDoc);
    return true;
  }
  catch (e) {
    try { if (templateDoc) closeDocumentNoSave(templateDoc); } catch(ignore) {}
    reportScriptError(e, "processTemplate");
    return false;
  }
}

function findLayers(searchFolder, recursion, userData, items) { 
  items = items || []; 
  var folderItem; 
  for (var i = 0; i < searchFolder.layers.length; i++) { 
      folderItem = searchFolder.layers[i];
      if (propertiesMatch(folderItem, userData)) { 
          items.push(folderItem); 
      } 
      if (recursion === true && folderItem.typename === "LayerSet") { 
          findLayers(folderItem, recursion, userData, items); 
      } 
  } 
  return items; 
} 

function propertiesMatch(projectItem, userData) {  
  if (typeof userData === "undefined") return true; 
  for (var propertyName in userData) { 
      if (!userData.hasOwnProperty(propertyName)) continue; 
      if (!projectItem.hasOwnProperty(propertyName)) return false; 
      if (projectItem[propertyName].toString() !== userData[propertyName].toString()) { 
          return false; 
      } 
  }
  return true; 
} 

function closeDocumentNoSave(doc) {
  try {
    doc.close(SaveOptions.DONOTSAVECHANGES);
  }
  catch (e) {}
}

function formatScriptError(e, context) {
  var parts = [];
  if (context) {
    parts.push(context);
  }
  if (e && e.message) {
    parts.push(e.message);
  } else {
    parts.push(String(e));
  }
  if (e && typeof e.line !== "undefined") {
    parts.push("Line: " + e.line);
  }
  if (e && e.fileName) {
    parts.push("File: " + e.fileName);
  }
  if (e && typeof e.number !== "undefined") {
    parts.push("Code: " + e.number);
  }
  return parts.join("\n");
}

function reportScriptError(e, context) {
  var message = formatScriptError(e, context);
  try { $.writeln(message); } catch(ignore) {}
  alert(message);
}

function getBaseName(file) {
  return file.name.replace(/\.[^\.]+$/, "");
}

function buildFileMap(files, label) {
  var map = {};
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var key = getBaseName(file).toLowerCase();
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      return {
        ok: false,
        error: label + " contains duplicate base name: " + file.name
      };
    }
    map[key] = file;
  }
  return {
    ok: true,
    map: map
  };
}

function buildDesignPairs(designFiles) {
  var designMapResult = buildFileMap(designFiles, "Design");
  if (!designMapResult.ok) {
    return designMapResult;
  }

  var pairs = [];
  for (var i = 0; i < designFiles.length; i++) {
    var designFile = designFiles[i];
    var designName = getBaseName(designFile);
    pairs.push({
      designFile: designFile,
      designName: designName
    });
  }

  return {
    ok: true,
    pairs: pairs
  };
}

function splitDesignPairsEvenly(designPairs, templateCount) {
  if (templateCount <= 0) {
    return {
      ok: false,
      error: "PSD file is not found"
    };
  }

  var groups = [];
  var totalDesigns = designPairs.length;
  var baseCount = Math.floor(totalDesigns / templateCount);
  var remainder = totalDesigns % templateCount;
  var designIndex = 0;

  for (var templateIndex = 0; templateIndex < templateCount; templateIndex++) {
    var batchSize = baseCount;
    if (templateIndex < remainder) {
      batchSize++;
    }

    var batch = [];
    for (var i = 0; i < batchSize; i++) {
      batch.push(designPairs[designIndex]);
      designIndex++;
    }
    groups.push(batch);
  }

  return {
    ok: true,
    groups: groups
  };
}

function applyRandomBackgroundSelection(doc) {
  var backgroundGroups = findBackgroundLayerSets(doc);
  if (backgroundGroups.length == 0) {
    alert("Background group is not found");
    return false;
  }

  for (var i = 0; i < backgroundGroups.length; i++) {
    if (!applyRandomLayerInGroup(backgroundGroups[i])) {
      return false;
    }
  }

  return true;
}

function findBackgroundLayerSets(searchFolder, items) {
  items = items || [];

  for (var i = 0; i < searchFolder.layers.length; i++) {
    var folderItem = searchFolder.layers[i];
    if (folderItem.typename === "LayerSet") {
      if (folderItem.name && folderItem.name.toLowerCase() == "background") {
        items.push(folderItem);
      }
      findBackgroundLayerSets(folderItem, items);
    }
  }

  return items;
}

function applyRandomLayerInGroup(layerSet) {
  var layers = [];
  for (var i = 0; i < layerSet.layers.length; i++) {
    layers.push(layerSet.layers[i]);
  }

  if (layers.length == 0) {
    alert("Background group is empty");
    return false;
  }

  var chosenIndex = Math.floor(Math.random() * layers.length);
  for (var j = 0; j < layers.length; j++) {
    layers[j].visible = (j == chosenIndex);
  }

  var parent = layerSet.parent;
  while (parent && parent.typename !== "Document") {
    parent.visible = true;
    parent = parent.parent;
  }
  layerSet.visible = true;
  layers[chosenIndex].visible = true;

  return true;
}

function touchLayer(layer) { 
  app.activeDocument.activeLayer = layer; 
  var desc = new ActionDescriptor(); 
  var ref = new ActionReference(); 
  ref.putIdentifier(app.charIDToTypeID('Lyr '), layer.id); 
  desc.putReference(app.charIDToTypeID('null'), ref); 
  executeAction(app.charIDToTypeID('slct'), desc, DialogModes.NO); 
  return layer; 
} 


function editContents(newFile, theSO) {    
  var smartObject;
  var objFile;
  try {    
  var lyrVis = theSO.visible; 
      app.activeDocument.activeLayer = theSO;  
  smartObject = openSmartObject(theSO);			// open smart object;
  smartObject.flatten()	
  smartObject.activeLayer.isBackgroundLayer=0;		// Make it a normal Layer
  smartObject.selection.selectAll();
  smartObject.selection.clear();						// One clear did not work
  var objWidth=smartObject.width.value;
  var objHeight=smartObject.height.value;	   
  open(File(newFile));								// open it into a document
  var layers = activeDocument.layers;
  activeDocument.activeLayer = layers[layers.length-1]; // Target Bottom Layer
  activeDocument.activeLayer.isBackgroundLayer=0; 	// Make it a normal Layer
  try {
    objFile= app.activeDocument;				// image document
    if (objFile.width.value/objFile.height.value > objWidth/objHeight) { //// wider
      objFile.resizeImage(null, objHeight, null, ResampleMethod.BICUBIC);
    } else {
      objFile.resizeImage(objWidth, null, null, ResampleMethod.BICUBIC);
    } // same aspect ratio or taller
    try {
      objFile.resizeCanvas(objWidth, objHeight, AnchorPosition.MIDDLECENTER);
    }	
    catch(e){}
    try{
      var mrkLayer = objFile.artLayers.add();				// Add a Layer
      mrkLayer.name = "TL BR Stamp";					// Name Layer
      mrkLayer.blendMode = BlendMode.OVERLAY;			// blend mode
    }
    catch(e){}
    var mrkColor = new SolidColor;						
    mrkColor.rgb.red = 128;
    mrkColor.rgb.green = 128;
    mrkColor.rgb.blue = 128;
    try{
      var selectedRegion = Array(Array(0,0), Array(1,0), Array(1,1), Array(0,1));  // Top Right
      objFile.selection.select(selectedRegion);		
      objFile.selection.fill(mrkColor);
      var selectedRegion = Array(Array(objWidth-1,objHeight-1), Array(objWidth,objHeight-1), Array(objWidth,objHeight), Array(objWidth-1,objHeight)); // Bottom Right
      objFile.selection.select(selectedRegion);		
      objFile.selection.fill(mrkColor);	
    }
    catch(e){}
    objFile.selection.selectAll();
    try {objFile.selection.copy(true); }			//copy merge resized image into clipboard
    catch(e){objFile.selection.copy(); }			//copy resized image into clipboard
    objFile.close(SaveOptions.DONOTSAVECHANGES);	//close image without saving changes		
    smartObject.paste();							//paste change smart object content from being empty
  }
  catch(e) { 
    try { if (objFile) objFile.close(SaveOptions.DONOTSAVECHANGES); } catch(ignore) {}
    try { if (smartObject) smartObject.close(SaveOptions.DONOTSAVECHANGES); } catch(ignore) {}
    reportScriptError(e, "editContents - image processing");
    return false;
  } // close image without saving changes smart object is empty though	
  if (smartObject.name.indexOf(".jpg")!=-1) smartObject.flatten();		
  smartObject.close(SaveOptions.SAVECHANGES);			//close and save
  theSO.visible =	lyrVis; 
      return app.activeDocument.activeLayer    
  }     
  catch(e) { 
    try { if (objFile) objFile.close(SaveOptions.DONOTSAVECHANGES); } catch(ignore) {}
    try { if (smartObject) smartObject.close(SaveOptions.DONOTSAVECHANGES); } catch(ignore) {}
    reportScriptError(e, "editContents");
    return false; 
  }    
}  

function openSmartObject (theLayer) {
	if (theLayer.kind == "LayerKind.SMARTOBJECT") {
		// =======================================================
		var idplacedLayerEditContents = stringIDToTypeID( "placedLayerEditContents" );
			var desc2 = new ActionDescriptor();
		executeAction( idplacedLayerEditContents, desc2, DialogModes.NO );
	};
	return app.activeDocument
};
