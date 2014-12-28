
// TODO: Transition to closure, use goog.provide.
goog.provide('games.morris');
goog.require('goog.Promise');


games.morris.MorrisGame = function (canvas) {
    var morris = {
        map: games.morris.nineManMorrisMap(),
        draw: draw,
        canvas: null,
        scale: 10,
        margin: 20,
        dotSize: 7.5,
        state: null,
        theme: {
            playerColors: [
                'SaddleBrown',
                'CadetBlue'
            ]
        }
    };
    morris.state = games.morris.newNineManMorrisState(morris.map);
    
    return morris;

    function draw() {
        var ctx = canvas.getContext('2d');
        ctx.save();
        ctx.clearRect(0,0,Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER);
        ctx.translate(morris.margin, morris.margin);
        //ctx.scale(morris.scale, morris.scale);

        drawBoard(ctx);
        drawState(ctx);
        drawDebug(ctx);

        ctx.restore();
    }

    function drawBoard(ctx) {
        ctx.lineWidth = 1;
        for (var key in morris.map.nodes) {
            if (morris.map.nodes.hasOwnProperty(key)) {
                var node = morris.map.nodes[key];
                ctx.beginPath();
                ctx.arc(morris.scale*node.x, morris.scale*node.y, morris.dotSize, 0, 2 * Math.PI)
                ctx.fill();
                for (var childKey in node.connections) {
                    if (node.connections.hasOwnProperty(childKey)) {
                        var child = morris.map.nodes[childKey];
                        ctx.beginPath();
                        ctx.moveTo(morris.scale*node.x, morris.scale*node.y);
                        ctx.lineTo(morris.scale*child.x, morris.scale*child.y);
                        ctx.stroke();
                    }
                }
            }
        }
    }
    
    function drawDebug(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'xor';
        ctx.fillStyle = 'black';
        ctx.font = "bold 10px Arial";
        ctx.textAlign = 'center';
        for (var key in morris.map.nodes) {
            if (morris.map.nodes.hasOwnProperty(key)) {
                var node = morris.map.nodes[key];
                var size = ctx.measureText(key);
                ctx.fillText(key.toUpperCase(), morris.scale*node.x, morris.scale*node.y+2.5);
            }   
        }
        ctx.restore();
    }
    
    function drawState(ctx) {
        var p;
        ctx.lineWidth = 4;

        for (var m = 0; m < morris.state.mills.length; m++) {
            var mill = morris.state.mills[m];

            // Get first node from mill and find out who owns it.
            var firstNode = mill[0],
                lastNode = mill[mill.length - 1];
            for (p = 0; p < morris.state.players.length; p++) {
                if (morris.state.players[p].places.indexOf(firstNode) !== -1) break;
            }
            
            // Draw line from firstNode to lastNode
            ctx.strokeStyle = morris.theme.playerColors[p];
            ctx.beginPath();
            ctx.moveTo(morris.scale*morris.map.nodes[firstNode].x, morris.scale*morris.map.nodes[firstNode].y);
            ctx.lineTo(morris.scale*morris.map.nodes[lastNode].x, morris.scale*morris.map.nodes[lastNode].y);
            ctx.stroke();
            
        }
        for (p = 0; p < morris.state.players.length; p++) {
            ctx.fillStyle = morris.theme.playerColors[p];
            var player = morris.state.players[p];
            for (var i = 0; i < player.places.length; i++) {
                var place = player.places[i];
                var node = morris.map.nodes[place];
                ctx.beginPath();
                ctx.arc(morris.scale*node.x, morris.scale*node.y, morris.dotSize * 2, 0, 2 * Math.PI)
                ctx.fill();
            }
        }
    }
    
}

/**
 * Enum for player states
 * @readonly
 * @enum {number}
 */
games.morris.PlayerStates = {
    /** Player to place a new piece. */
    PLACE_PIECE: 1,
    /** Player to move an existing piece. */
    MOVE_PIECE: 2,
    /** Player to remove an opponent's piece. */
    REMOVE_PIECE: 3,
    /** Player has lost. */
    LOST: 4
};

/**
 * Enum for player actions
 * @readonly
 * @enum {number}
 */
games.morris.PlayerActions = {
    /** Player places a new piece. */
    PLACE_PIECE: 1,
    /** Player moves an existing piece. */
    MOVE_PIECE: 2,
    /** Player removes an opponent's piece. */
    REMOVE_PIECE: 3
};


/**
 * Creates a new game state for Nine Man Morris
 */
games.morris.newNineManMorrisState = function (map) {
    return {
        map: map,
        currentPlayer: 0,
        mills: [],
        playerState: games.morris.PlayerStates.PLACE_PIECE,
        players: [
            { pieces: 9, places: [] },
            { pieces: 9, places: [] }
        ]
    }
}

/**
 * Clones the game state, but copies by reference elements of the state that
 * don't change move-by-move.
 */
games.morris.cloneState = function(state) {
    return {
        map: state.map,
        currentPlayer: state.currentPlayer,
        mills: state.mills.slice(0),
        playerState: state.playerState,
        players: state.players.map(function(player) {
            return {
                pieces: player.pieces,
                places: player.places.slice(0)
            }
        })
    };
}


/**
 * Enumerates legal moves given a valid game state.
 */
games.morris.getValidMoves = function(state, force) {
    if (state._validMoves && !force) return state._validMoves;
    var player = state.players[state.currentPlayer];
    var moves = [], key;

    // Collect list of occupied spaces:
    var occupied = [];
    for (var i = 0; i < state.players.length; i++) {
        occupied = occupied.concat(state.players[i].places);
    }

    switch (state.playerState) {
        case games.morris.PlayerStates.PLACE_PIECE:
            // List moves to empty nodes.
            for (key in state.map.nodes) {
                // If node is not occupied
                if (state.map.nodes.hasOwnProperty(key) && occupied.indexOf(key) === -1) {
                    // Add move to list.
                    moves.push({
                        action: games.morris.PlayerActions.PLACE_PIECE,
                        node: key
                    });
                }
            }
            break;
        case games.morris.PlayerStates.MOVE_PIECE:
            // List moves from player's pieces to adjacent unoccupied nodes.
            for (var i = 0; i < player.places.length; i++) {
                key = player.places[i];
                var node = state.map.nodes[key];
                // For each connection to node
                for (var childKey in node.connections) {
                    // If node is not occupied
                    if (node.connections.hasOwnProperty(childKey) && occupied.indexOf(childKey) === -1) {
                        // Add move to list
                        moves.push({
                            action: games.morris.PlayerActions.MOVE_PIECE,
                            node: key,
                            targetNode: childKey
                        });
                    }
                }
            }
            break;
        case games.morris.PlayerStates.REMOVE_PIECE:
            // List opponent's pieces not in a mill.
            for (var p = 0; p < state.players.length; p++) {
                if (p !== state.currentPlayer) {
                    var player = state.players[p];
                    for (var i = 0; i < player.places.length; i++) {
                        var place = player.places[i];
                        if (!games.morris.checkMill(state, p, place)) {
                            moves.push({
                                action: games.morris.PlayerActions.REMOVE_PIECE,
                                node: place
                            });
                        }
                    }
                }
            }
            break;
    }
    state._validMoves = moves;
    return moves;
}

games.morris.checkMill = function(state, player, node) {
    if (state.playerPlaces[node] === player) {
        for (var i = 0; i < state.mills.length; i++) {
            var mill = state.mills[i];
            if (mill.indexOf(node) !== -1) return true;
        }
    }
    return false;
}

games.morris.calculateState = function(state) {
    // Create a collection of place -> player, to easily see who is on a spot.
    state.playerPlaces = {};
    for (var p = 0; p < state.players.length; p++) {
        var player = state.players[p];
        for (var i = 0; i < player.places.length; i++) {
            var place = player.places[i];
            state.playerPlaces[place] = p;
        }
        // Calculate Score
        player.score = player.places.length; // (That was easy)
        if (p == state.currentPlayer 
            && state.playerState === games.morris.PlayerStates.LOST) {
            player.score = 0;
        }
            
    }
    
    // Create a collection of active mills
    state.mills = [];
    for (var i = 0; i < state.map.mills.length; i++) {
        var mill = state.map.mills[i];
        var firstNode = mill[0];
        if (state.playerPlaces.hasOwnProperty(firstNode)) {
            var valid = true;
            var p = state.playerPlaces[firstNode];
            for (var x = 1; x < mill.length; x++) {
                valid &= state.playerPlaces[mill[x]] === p;
            }
            if (valid) state.mills.push(mill);
        }
    }
    
};


/**
 * Executes a move and returns a new game state, leaving the original untouched.
 */
games.morris.executeMove = function(state, move) {
    var newState = games.morris.cloneState(state),
        player = newState.players[newState.currentPlayer],
        i;
    
    // TODO: Validate move.
    
    switch (move.action) {
        case games.morris.PlayerActions.MOVE_PIECE:
            executeMove();
            break;
        case games.morris.PlayerActions.PLACE_PIECE:
            executePlace();
            break;
        case games.morris.PlayerActions.REMOVE_PIECE:
            executeRemove();
            break;
    }
    return newState;
    
    function executeMove() {
        player.places[player.places.indexOf(move.node)] = move.targetNode;
        followupMove(move.targetNode);
        
    }
    function executePlace() {
        player.places.push(move.node);
        player.pieces--;
        followupMove(move.node);
    }
    function followupMove(node) {
        games.morris.calculateState(newState);        
        if (games.morris.checkMill(newState, newState.currentPlayer, node)) {
            newState.playerState = games.morris.PlayerStates.REMOVE_PIECE;
            // Verify player can actually remove a piece before proceeding.
            var moves = games.morris.getValidMoves(newState, /* force */ true);
            if (moves.length == 0) {
                // Nothing for the player to remove. Move on to next player.
                incrementPlayer();
            }
        } else {
            incrementPlayer();
        }
    }
    function incrementPlayer() {
        newState.currentPlayer++;
        // Cycle down to first player after last player.
        if (newState.currentPlayer === newState.players.length) newState.currentPlayer = 0;

        // Check if next player should place or move
        if (newState.players[newState.currentPlayer].pieces === 0) {
            // Player has placed all their men. Time to move.
            newState.playerState = games.morris.PlayerStates.MOVE_PIECE;
            var moves = games.morris.getValidMoves(newState, /* force */ true);
            if (moves.length == 0) {
                // Player is trapped, or has no pieces. Game is over.
                newState.playerState = games.morris.PlayerStates.LOST;
                newState.players[newState.currentPlayer].score = 0;
            }
        } else {
            // Player still has men in their hand. Place more.
            newState.playerState = games.morris.PlayerStates.PLACE_PIECE;
        }

    }
    function executeRemove() {    
        var victim = newState.players[state.playerPlaces[move.node]];
        victim.places.splice(victim.places.indexOf(move.node), 1);
        games.morris.calculateState(newState);
        incrementPlayer();
    }
};

/**
 * Creates a Nine Man Morris map
 */
games.morris.nineManMorrisMap = function() {
    /*                111111111122222
            0123456789012345678901234
        0   a-----------b-----------c
        2   |           |           |
        4   |   d-------e-------f   |
        6   |   |       |       |   |
        8   |   |   g---h---i   |   |
        10  |   |   |       |   |   |
        12  j---k---l       m---n---o
        14  |   |   |       |   |   |
        16  |   |   p---q---r   |   |
        18  |   |       |       |   |
        20  |   s-------t-------u   |
        22  |           |           |
        24  v-----------w-----------x
    */
    return {
        mills: [
            ['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i'], ['j', 'k', 'l'], 
            ['m', 'n', 'o'], ['p', 'q', 'r'], ['s', 't', 'u'], ['v', 'w', 'x'], 
            ['a', 'j', 'v'], ['d', 'k', 's'], ['g', 'l', 'p'], ['b', 'e', 'h'], 
            ['q', 't', 'w'], ['i', 'm', 'r'], ['f', 'n', 'u'], ['c', 'o', 'x']
        ],
        nodes: {
            a: {x: 0, y: 0, connections: {b: 11,j: 11}},
            b: {x: 12, y: 0, connections: {a: 11,c: 11,e: 3}},
            c: {x: 24, y: 0, connections: {b: 11,o: 11}},
            d: {x: 4, y: 4, connections: {e: 7,k: 7}},
            e: {x: 12, y: 4, connections: {b: 3,d: 7,f: 7,h: 3}},
            f: {x: 20, y: 4, connections: {e: 7,n: 7}},
            g: {x: 8, y: 8, connections: {h: 3,l: 3}},
            h: {x: 12, y: 8, connections: {e: 3,g: 3,i: 3}},
            i: {x: 16, y: 8, connections: {h: 3,m: 3}},
            j: {x: 0, y: 12, connections: {a: 11,k: 3,v: 11}},
            k: {x: 4, y: 12, connections: {d: 7,j: 3,l: 3,s: 7}},
            l: {x: 8, y: 12, connections: {g: 3,k: 3,p: 3}},
            m: {x: 16, y: 12, connections: {i: 3,n: 3,r: 3}},
            n: {x: 20, y: 12, connections: {f: 7,m: 3,o: 3,u: 7}},
            o: {x: 24, y: 12, connections: {c: 11,n: 3,x: 11}},
            p: {x: 8, y: 16, connections: {l: 3,q: 3}},
            q: {x: 12, y: 16, connections: {p: 3,r: 3,t: 3}},
            r: {x: 16, y: 16, connections: {m: 3,q: 3}},
            s: {x: 4, y: 20, connections: {k: 7,t: 7}},
            t: {x: 12, y: 20, connections: {q: 3,s: 7,u: 7,w: 3}},
            u: {x: 20, y: 20, connections: {n: 7,t: 7}},
            v: {x: 0, y: 24, connections: {j: 11,w: 11}},
            w: {x: 12, y: 24, connections: {t: 3,v: 11,x: 11}},
            x: {x: 24, y: 24, connections: {o: 11,w: 11}}
        }
    };
}

function findShortestPath(map, start, end) {
    var nodes = {};
    var visited = {};
    for (var node in map.nodes) {
        if (map.nodes.hasOwnProperty(node)) {
            nodes[node] = Infinity;
        }
    }

    // Set starting node
    nodes[start] = 0;
    findShortestPathRecur(start);

    function findShortestPathRecur(node) {
        if (visited[node]) return;
        visited = true;
        var neighbors = map.nodes[node];
        for (var neighbor in neighbors) {
            if (neighbors.hasOwnProperty(neighbor)) {

            }
        }
    }
}


games.morris.workerMain = function() {
    addEventListener('message', games.ai.workerMessage, false);
};

games.morris.workerMessage = function(e) {
    var data = e.data;
    switch (data.command) {
        case 'games.morris.nextMove':
            postMessage('games.morris.response', { context: data, response: games.morris.nextMove(data.state, data.time) });
            break;
    }
}

games.morris.nextMove = function(state, time) {
    return games.ai.nextMove(games.morris, state, {
        minCycles: 0,
        maxCycles: 0,
        minTime: 0,
        maxTime: time,
        minLevels: 0,
        maxLevels: 0
    });

}