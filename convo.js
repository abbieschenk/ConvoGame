/**
 * TODO
 * - Response ordering: Number box representing priority.
 * - Adding new nodes
 * - Character editing
 * - Import dialogue
 * - Delete nodes
 * - Don't allow connection to self
 * - Multiple endpoint connections are hard to drag around/remove. Maybe
 *   have a way to remove connections from the node-editor?
 *
 **/

var dialogueRoot;
var idCounter = 0;
var currentSelection;

var dialogueNodes = [];

function inArray(array, value) {
    for (var i = 0; i < array.length; i++) {
        if (array[i] === value) return true;
    }
    return false;
}

var startpointOptions = {
    isSource:true,
    endpoint: ["Dot", {radius:7}],
    connector: ["Flowchart"],
    connectorStyle: {
        strokeStyle: "black",
        lineWidth: 3,
    }, paintStyle: {
        fillStyle:"black"
    }, maxConnections: 999999
};

var endpointOptions = Object.create(startpointOptions);

endpointOptions.isSource = false;
endpointOptions.isTarget = true;

function buildRecursiveAddToBody(dialogue) {
    var foundNode = dialogueNodes["dialogue-node-" + dialogue.id];

    if(foundNode) {
        return foundNode;
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
        currentSelection = node;
        $("#node-text").val(dialogue.text);
        $("#node-character").val(dialogue.character);
        $("#node-priority").val(dialogue.priority);
    });

    return node;
}

function recursivelyResolveReferences(dialogue) {
    $.each(dialogue.references, function(key, value) {
        dialogue.responses.push(findNode(value));
    });

    dialogue.references = [];

    $.each(dialogue.responses, function(key, value) {
        recursivelyResolveReferences(value);
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

function resolveReferences() {

}

$(function() {
    // TODO Arrows?
    //
    // jsPlumb.Defaults.Overlays = [
    //     [ "Arrow", {
    //         location:1,
    //         id:"arrow",
    //         length:14,
    //         foldback:1.0
    //     } ],
    //     [ "Arrow", {
    //         location:2,
    //         id:"arrow-2",
    //         length:14,
    //         foldback:1.0
    //     } ],
    // ];
    $.getJSON("test-dialogue.json", function( data ) {
        dialogueRoot = data;

         $.each(dialogueRoot.dialogues, function(key, value) {
             recursivelyResolveReferences(value);
             buildRecursiveAddToBody(value);
         });
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
        }
    });

    jsPlumb.bind("connectionDetached", function(info, originalEvent) {
        if(!originalEvent) return;

        var sourceNode = dialogueNodes[info.sourceId];
        var targetNode = dialogueNodes[info.targetId];

        sourceNode.dialogue.responses.splice(sourceNode.dialogue.responses.indexOf(targetNode.dialogue), 1);

        // TODO need warning if node will not be exported, i.e. has no parents
    });

    $("#node-text").change(function() {
        var changedVal = $("#node-text").val();
        currentSelection.dialogue.text = changedVal;
        currentSelection.text(changedVal);
        jsPlumb.repaintEverything();
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
            "href" : "data:application/json," + encodeURIComponent(JSON.stringify(dialogueExport, null, 2))
        }).appendTo("body").click(function() {
             $(this).remove()
        })[0].click();
    });
});
