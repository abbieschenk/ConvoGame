
var dialogueRoot;
var idCounter = 0;

function buildRecursiveAddToBody(dialogue) {
    
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
    
    var node = $("<div/>", {
        class: "dialogue-node",
        // TODO: this is wrong, need to read + write
        id: "dialogue-node-" + idCounter++,
        style: "left: " + dialogue.x + "px; top: " + dialogue.y + "px",
    }).appendTo("#convo-editor");
    
    node.text(dialogue.text);
    
    jsPlumb.draggable(node);
    
    setTimeout(function() {
        var startpoint = jsPlumb.addEndpoint(node, { anchor: "BottomCenter"}, startpointOptions);
    
        $.each(dialogue.responses, function(key, value) {
            var child = buildRecursiveAddToBody(value);

            setTimeout(function() {
                var endpoint = jsPlumb.addEndpoint(child, { anchor: "TopCenter"}, endpointOptions);
                jsPlumb.connect({source: startpoint, target: endpoint});
            }, 0);
        });
    });
    
    return node;
}


$(function() {
    $.getJSON("test-dialogue.json", function( data ) {
        dialogueRoot = data.dialogues;
        
         $.each(dialogueRoot, function(key, value) {
             buildRecursiveAddToBody(value);
         }); 
    });
});