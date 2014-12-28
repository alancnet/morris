// TODO: Transition to closure, use goog.provide.
goog.provide('games.ai');
goog.require('goog.Promise');
games.ai.nextMove = function(game, state, options) {
    return new goog.Promise(function(resolve, reject) {
        var endTime = new Date().getTime() + options.maxTime;
        var currentPlayer = state.currentPlayer;
        var baseMoves = game.getValidMoves(state);
        var levelMoves = baseMoves.slice(0);
        var levels = 0;
        for (var i = 0; i < baseMoves.length; i++) {
            var move = baseMoves[i];
            move.ai = {
                baseMove: i,
                score: 0,
                count: 0,
                state: state
            };
        }
        
        while (running()) {
            singlePass();
        }

        // Finalize calculation on baseMoves, and find the best.
        var bestMoves = [];
        var bestScore = Number.MIN_SAFE_INTEGER;
        for (var i = 0; i < baseMoves.length; i++) {
            var move = baseMoves[i];
            move.ai.average = move.ai.score / move.ai.count;
            if (move.ai.average > bestScore) {
                bestScore = move.ai.average;
                bestMoves = [];
            }
            if (move.ai.average === bestScore) {
                bestMoves.push(move);
            }
        }
        
        resolve(bestMoves);

        function singlePass() {
            levels++;
            var newMoves = [];
            var newStates = [];
            var newValidMoves = [];
            
            // Do the heavy lifting first.
            for (var i = 0; i < levelMoves.length && running(); i++) {
                var move = levelMoves[i];
                var baseMove = baseMoves[move.ai.baseMove];
                // Simulate the move
                newStates[i] = game.executeMove(move.ai.state, move);
                
                // Prepare subsequent moves
                newValidMoves[i] = game.getValidMoves(newStates[i]);
                
            }
            // If the heavy lifting finished in the time alotted, commit 
            // calculations.
            if (running()) {
                for (var i = 0; i < levelMoves.length; i++) {
                    var move = levelMoves[i];
                    var baseMove = baseMoves[move.ai.baseMove];
                    var newState = newStates[i];
                    // Track score
                    var myScore = newState.players[currentPlayer].score;
                    for (var p = 0; p < newState.players.length; p++) {
                        if (p !== currentPlayer) {
                            myScore -= newState.players[p].score;
                        }
                    }
                    baseMove.ai.score += myScore;
                    baseMove.ai.count++;
    
                    // Prepare subsequent moves
                    var theseMoves = newValidMoves[i];
                    for (var x = 0; x < theseMoves.length && running(); x++) {
                        var thisMove = theseMoves[x];
                        thisMove.ai = {
                            baseMove: move.ai.baseMove,
                            state: newState
                        };
                    }
                    newMoves.push.apply(newMoves, theseMoves);
                }
                levelMoves = newMoves;
            } else {
            }
            //levelMoves.sort(function() { return Math.random() - Math.random(); });
        }
        
        function running() {
            return new Date().getTime() < endTime;
        }
    });    
}
