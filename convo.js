/**
 * TODO
 * - Loops break on export (max call stack exceeded)
 * - Character editing
 * - Multiple endpoint connections are hard to drag around/remove. Maybe
 *   have a way to remove connections from the node-editor?
 **/

var dialogueRoot;
var idCounter;
var currentSelection;
var dialogueNodes;

var startpointOptions = {
    isSource:true,
    endpoint: ["Dot", {radius:7}],
    connector: ["Flowchart"],
    connectorStyle: {
        strokeStyle: "black",
        lineWidth: 2,
    }, paintStyle: {
        fillStyle:"black",
        strokeStyle:"white",
        lineWidth:2
    }, maxConnections: 999999
};

var endpointOptions = Object.create(startpointOptions);

endpointOptions.isSource = false;
endpointOptions.isTarget = true;

jsPlumb.Defaults.Overlays = [
    [ "Arrow", {
        location:1,
        width: 16,
        length:14,
        foldback:1.0,
        cssClass: 'arrow-overlay',
    } ]
];

function inArray(array, value) {
    for (var i = 0; i < array.length; i++) {
        if (array[i] === value) return true;
    }
    return false;
}

function buildRecursiveAddToBody(dialogue) {
    var foundNode = dialogueNodes["dialogue-node-" + dialogue.id];

    if(foundNode) {
        return foundNode;
    }

    if(idCounter < dialogue.id) {
        idCounter = dialogue.id + 1;
    }

    var node = $("<div/>", {
        class: "dialogue-node",
        id: "dialogue-node-" + dialogue.id,
        style: "left: " + dialogue.x + "px; top: " + dialogue.y + "px",
    }).appendTo("#convo-editor");

    node.text(dialogue.text);
    node.dialogue = dialogue;

    jsPlumb.draggable(node, {
        stop: function(event, ui) {
            // Write to dialogue.
            node.dialogue.x = node.position().left;
            node.dialogue.y = node.position().top;
        }
    });

    setTimeout(function() {
        var startpoint = jsPlumb.addEndpoint(node, { anchor: "BottomCenter"}, startpointOptions);
        var endpoint = jsPlumb.addEndpoint(node, { anchor: "TopCenter"}, endpointOptions);

        node.startpoint = startpoint;
        node.endpoint = endpoint;

        $.each(dialogue.responses, function(key, value) {
            var child = buildRecursiveAddToBody(value);

            setTimeout(function() {
                jsPlumb.connect({source: startpoint, target: child.endpoint});
            }, 0);
        });
    });

    if(!dialogue.responses) {
        dialogue.responses = [];
    }

    dialogueNodes[node.attr("id")] = node;

    node.click(function() {

        $("#editor-buttons").show();
        $("#editor-text").hide();

        if(currentSelection) {
            currentSelection.removeClass("selected");
        }
        node.addClass("selected");

        if(dialogueRoot.dialogues.indexOf(dialogue) >= 0) {
            $("#delete-button").hide();
        } else {
            $("#delete-button").show();
        }

        currentSelection = node;
        $("#node-text").val(dialogue.text);
        $("#node-character").val(dialogue.character);
        $("#node-priority").val(dialogue.priority);
        $("#node-show-if").val(dialogue.flag);
        $("#node-on-complete-quest").val(dialogue.toggleFlag);
        $("#node-on-complete-function").val(dialogue.onCompleteFunction);
    });

    return node;
}

function resolveReferences(dialogue) {
    $.each(dialogue.references, function(key, value) {
        dialogue.responses.push(findNode(value));
    });

    dialogue.references = [];

    $.each(dialogue.responses, function(key, value) {
        resolveReferences(value);
    });
}

function findNode(id, dialogueNode) {
    var foundNode;

    if(dialogueNode === undefined) {
        $.each(dialogueRoot.dialogues, function(key, value) {
            var found = findNode(id, value);
            if(found) return foundNode = found;
        });
    } else {
        if(dialogueNode.id === id) {
            return dialogueNode;
        } else {
            $.each(dialogueNode.responses, function(key, value) {
                var found = findNode(id, value);
                if(found) return foundNode = found;
            });
        }
    }

    return foundNode;
}

function findParents(id) {
    var parents = [];

    function _findParents(searchNode) {
        $.each(searchNode.responses, function(key, value) {
            if(value.id === id) {
                parents.push(searchNode);
            }

            _findParents(value);
        });
    };

    $.each(dialogueRoot.dialogues, function(key, value) {
        _findParents(value);
    });

    return parents;
}

function noParentWarning(dialogue) {
    var parents = findParents(dialogue.id);
    if(parents === undefined || parents.length === 0) {
        $("#dialogue-node-" + dialogue.id).addClass("no-parents");
    }
}

function loadData(jsonData) {
    dialogueRoot = jsonData;

    $.each(dialogueRoot.dialogues, function(key, value) {
         resolveReferences(value);
         buildRecursiveAddToBody(value);
     });

     jsPlumb.repaintEverything();
}



function convo(jsonData) {
    $("#convo-editor").empty();

    idCounter = 0;
    dialogueNodes = [];

    if(!jsonData) {
        $.getJSON("test-dialogue.json", function( data ) {
            loadData(data);
        });
    } else {
        loadData(jsonData);
    }

    jsPlumb.bind("beforeDrop", function(params){
        if(params.sourceId === params.targetId) {
            return false;
        } else {
            return true;
        }
    });

    jsPlumb.bind("connection", function(info, originalEvent) {
        if(!originalEvent) return;

        var sourceNode = dialogueNodes[info.sourceId];
        var targetNode = dialogueNodes[info.targetId];

        var alreadyConnected = false;

        $.each(sourceNode.dialogue.responses, function(key, value) {
            if(value.id === info.targetId) {
                alreadyConnected = true;
                console.warn("Warning: Tried to connect " + info.sourceId + " to " + info.targetId + " but connection already exists.");
                return;
            }
        });

        if(!alreadyConnected) {
            sourceNode.dialogue.responses.push(targetNode.dialogue);

            targetNode.removeClass("no-parents");
        }
    });

    jsPlumb.bind("connectionDetached", function(info, originalEvent) {
        if(!originalEvent) return;

        var sourceNode = dialogueNodes[info.sourceId];
        var targetNode = dialogueNodes[info.targetId];

        sourceNode.dialogue.responses.splice(sourceNode.dialogue.responses.indexOf(targetNode.dialogue), 1);

        noParentWarning(targetNode.dialogue);
    });
}

$(function() {
    convo();

    $("#node-text").on('change keyup paste', function() {
        var changedVal = $("#node-text").val();
        currentSelection.dialogue.text = changedVal;
        currentSelection.text(changedVal);
        jsPlumb.repaintEverything();
    });

    $("#node-character").on('change keyup paste', function() {
        currentSelection.dialogue.character = $("#node-character").val();
    });

    $("#node-priority").on('change keyup paste', function() {
        currentSelection.dialogue.priority = $("#node-priority").val();
    });

    $("#node-show-if").on('change keyup paste', function() {
        currentSelection.dialogue.flag = $("#node-show-if").val();
    });

    $("#node-on-complete-quest").on('change keyup paste', function() {
        currentSelection.dialogue.toggleFlag = $("#node-on-complete-quest").val();
    });

    $("#node-on-complete-function").on('change keyup paste', function() {
        currentSelection.dialogue.onCompleteFunction = $("#node-on-complete-function").val();
    });

    $("#add-button").click(function() {
        var newDialogue = {
            text: "New Child",
            x: currentSelection.dialogue.x + (Math.floor(Math.random() * 201) - 100),
            y: currentSelection.dialogue.y + 100,
            id: idCounter++,
        };

        console.log(newDialogue);
        currentSelection.dialogue.responses.push(newDialogue);

        var newNode = buildRecursiveAddToBody(newDialogue);

        setTimeout(function(){
            jsPlumb.connect({source: currentSelection.startpoint, target: newNode.endpoint});
        });
    });

    $("#delete-button").click(function() {
        var toDelete = currentSelection.dialogue;
        jsPlumb.detachAllConnections("dialogue-node-" + toDelete.id);
        jsPlumb.removeAllEndpoints("dialogue-node-" + toDelete.id);
        $("#dialogue-node-" + toDelete.id).remove();

        $.each(findParents(toDelete.id), function(key, value) {
            value.responses.splice(value.responses.indexOf(toDelete), 1);
        })

        $.each(toDelete.responses, function(key, value) {
            noParentWarning(value);
        });

        $("#editor-buttons").hide();
        $("#editor-text").show();

        toDelete.responses = [];
    });

    $("#import-button").click(function() {
        if (window.File && window.FileReader && window.FileList && window.Blob) {
            var importFiles = document.getElementById("import-file").files;

            if(!importFiles) {
                alert("No import file selected.");
                return;
            }

            var importFile = importFiles[0];

            if(!importFile.type.match('application/json')) {
                alert("Not a JSON file!");
                return;
            }

            var reader = new FileReader();

            reader.onloadend = function(e) {
                var result = JSON.parse(this.result);

                jsPlumb.reset();
                setTimeout(function () {
                    convo(result);
                });
            };

            reader.readAsText(importFile);
        } else {
          alert('The File APIs are not fully supported in this browser.');
        }
    });

    $("#export-button").click(function() {
        var dialogueExport = jQuery.extend(true, {}, dialogueRoot);

        var passedIDs = [];

        var recursivelyFindLoops = function(dialogue) {
            passedIDs.push(dialogue.id);

            var toRemove = [];

            $.each(dialogue.responses, function(key, value) {
                if(inArray(passedIDs, value.id)) {
                    if(!dialogue.references)
                        dialogue.references = [];

                    toRemove.push(value);
                    dialogue.references.push(value.id);
                } else {
                    recursivelyFindLoops(value);
                }
            });

            $.each(toRemove, function(key, value) {
                dialogue.responses.splice(dialogue.responses.indexOf(value), 1);
            });
        };

        $.each(dialogueExport.dialogues, function(key, value) {
            recursivelyFindLoops(value);
        });

        $("<a />", {
            "download": "data.json",
            "href" : "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dialogueExport, null, 2))
        }).appendTo("body").click(function() {
             $(this).remove()
        })[0].click();
    });
});
