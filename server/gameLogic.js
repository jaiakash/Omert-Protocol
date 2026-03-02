/**
 * Omertà Protocol - Core Game Logic State Machine
 * Handles phases, role assignment, and rule enforcement.
 */

const ROLES = {
    MAFIA: 'Mafia',
    DOCTOR: 'Doctor',
    DETECTIVE: 'Detective',
    CIVILIAN: 'Civilian',
};

const PHASES = {
    LOBBY: 'Lobby',
    NIGHT_ACTION: 'Night (Hidden Actions)',
    DAY_TALKING: 'Day (Discussion)',
    DAY_VOTING: 'Day (Voting)',
    GAME_OVER: 'Game Over',
};

class GameState {
    constructor(roomId) {
        this.roomId = roomId;
        this.players = []; // { id, name, role, isAlive, socketId }
        this.phase = PHASES.LOBBY;
        this.dayCount = 0;
        this.votes = {}; // voterId -> targetId
        this.nightActions = {
            mafiaAction: {}, // mafiaClansmanId -> targetId
            doctorTarget: null,
            detectiveTarget: null,
            detectiveResult: null,
        };
        this.messages = []; // { sender, text, type: 'public' | 'mafia' }
        this.graveyard = [];
        this.winner = null;
        this.lastDeath = null;
    }

    addPlayer(id, name, socketId) {
        if (this.phase !== PHASES.LOBBY) return false;
        this.players.push({
            id,
            name,
            role: null,
            isAlive: true,
            socketId,
        });
        return true;
    }

    assignRoles() {
        const playerCount = this.players.length;
        let rolesToAssign = [ROLES.MAFIA, ROLES.DOCTOR, ROLES.DETECTIVE];

        // Add 2nd Mafia if > 6 players
        if (playerCount > 6) rolesToAssign.push(ROLES.MAFIA);

        while (rolesToAssign.length < playerCount) {
            rolesToAssign.push(ROLES.CIVILIAN);
        }

        rolesToAssign = rolesToAssign.sort(() => Math.random() - 0.5);
        this.players.forEach((player, index) => {
            player.role = rolesToAssign[index];
        });
    }

    handleAction(playerId, actionType, targetId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || !player.isAlive) return;

        if (this.phase === PHASES.NIGHT_ACTION) {
            if (player.role === ROLES.MAFIA) {
                this.nightActions.mafiaAction[playerId] = targetId;
            } else if (player.role === ROLES.DOCTOR) {
                this.nightActions.doctorTarget = targetId;
            } else if (player.role === ROLES.DETECTIVE) {
                this.nightActions.detectiveTarget = targetId;
                const target = this.players.find(p => p.id === targetId);
                this.nightActions.detectiveResult = target ? { id: targetId, role: target.role } : null;
            }
        } else if (this.phase === PHASES.DAY_VOTING) {
            this.votes[playerId] = targetId;
        }
    }

    nextPhase() {
        switch (this.phase) {
            case PHASES.LOBBY:
                this.assignRoles();
                this.phase = PHASES.NIGHT_ACTION;
                this.dayCount = 1;
                break;

            case PHASES.NIGHT_ACTION:
                this.processNightActions();
                this.phase = PHASES.DAY_TALKING;
                this.votes = {};
                break;

            case PHASES.DAY_TALKING:
                this.phase = PHASES.DAY_VOTING;
                break;

            case PHASES.DAY_VOTING:
                this.processVotingResults();
                if (!this.checkWinConditions()) {
                    this.phase = PHASES.NIGHT_ACTION;
                    this.dayCount++;
                } else {
                    this.phase = PHASES.GAME_OVER;
                }
                break;

            default:
                break;
        }
        return true;
    }

    processNightActions() {
        // Determine Mafia target (plurality or random if tied)
        const mafiaVotes = Object.values(this.nightActions.mafiaAction);
        const voteCounts = {};
        mafiaVotes.forEach(v => voteCounts[v] = (voteCounts[v] || 0) + 1);

        let mafiaTarget = null;
        let max = 0;
        for (const [id, count] of Object.entries(voteCounts)) {
            if (count > max) {
                max = count;
                mafiaTarget = id;
            }
        }

        this.lastDeath = null;
        if (mafiaTarget && mafiaTarget !== this.nightActions.doctorTarget) {
            const victim = this.players.find(p => p.id === mafiaTarget);
            if (victim) {
                victim.isAlive = false;
                this.graveyard.push(victim.name);
                this.lastDeath = victim.name;
            }
        }

        // Reset actions but keep detective result for the detective's view in the next phase if needed
        // Actually, we clear it and the server should send it once. 
        this.nightActions.mafiaAction = {};
        this.nightActions.doctorTarget = null;
    }

    processVotingResults() {
        const counts = {};
        Object.values(this.votes).forEach(targetId => {
            counts[targetId] = (counts[targetId] || 0) + 1;
        });

        let lynchedId = null;
        let max = 0;
        for (const [id, count] of Object.entries(counts)) {
            if (count > max) {
                max = count;
                lynchedId = id;
            }
        }

        if (lynchedId) {
            const victim = this.players.find(p => p.id === lynchedId);
            if (victim) {
                victim.isAlive = false;
                this.graveyard.push(victim.name);
            }
        }
    }

    checkWinConditions() {
        const aliveMafia = this.players.filter(p => p.isAlive && p.role === ROLES.MAFIA).length;
        const aliveTowns = this.players.filter(p => p.isAlive && p.role !== ROLES.MAFIA).length;

        if (aliveMafia === 0) {
            this.winner = 'Townsfolk';
            return true;
        }
        if (aliveMafia >= aliveTowns) {
            this.winner = 'Mafia';
            return true;
        }
        return false;
    }

    getFilteredState(playerId) {
        const requester = this.players.find(p => p.id === playerId);
        if (!requester) return null;

        return {
            roomId: this.roomId,
            phase: this.phase,
            dayCount: this.dayCount,
            players: this.players.map(p => {
                const base = { id: p.id, name: p.name, isAlive: p.isAlive };
                // Mafia see each other
                if (requester.role === ROLES.MAFIA && p.role === ROLES.MAFIA) {
                    base.role = ROLES.MAFIA;
                }
                // Always see your own role
                if (p.id === playerId) {
                    base.role = p.role;
                }
                return base;
            }),
            graveyard: this.graveyard,
            winner: this.winner,
            lastDeath: this.lastDeath,
            messages: this.messages.filter(m =>
                m.type === 'public' || (m.type === 'mafia' && requester.role === ROLES.MAFIA)
            ),
            // Only detective gets their result
            investigation: (requester.role === ROLES.DETECTIVE) ? this.nightActions.detectiveResult : null,
            votes: this.phase === PHASES.DAY_VOTING ? this.votes : {}
        };
    }
}

module.exports = { GameState, ROLES, PHASES };
