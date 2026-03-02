import React, { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import { Ghost, Users, MessageSquare, Skull, Play, ShieldAlert } from 'lucide-react';

function App() {
  const [playerName, setPlayerName] = useState('');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [joined, setJoined] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [message, setMessage] = useState('');

  const { roomState, createRoom, startGame, nextPhase, isConnected, sendAction, sendMessage } = useSocket(
    currentRoom,
    playerName,
    (newId) => setCurrentRoom(newId)
  );

  const myPlayer = roomState?.players.find(p => p.name === playerName);
  const isHost = roomState?.players[0]?.id === roomState?.players.find(p => p.name === playerName)?.id; // Simple host logic

  // Update room code when state arrives
  useEffect(() => {
    if (roomState?.roomId && !currentRoom) {
      setCurrentRoom(roomState.roomId);
    }
  }, [roomState]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (playerName && roomIdInput) {
      setCurrentRoom(roomIdInput.toUpperCase());
      setJoined(true);
    }
  };

  const handleCreate = () => {
    if (playerName) {
      createRoom();
      setJoined(true);
    }
  };

  const onSendChat = (e) => {
    e.preventDefault();
    if (message.trim()) {
      const type = (myPlayer?.role === 'Mafia' && roomState?.phase === 'Night (Hidden Actions)') ? 'mafia' : 'public';
      sendMessage(currentRoom, message, type);
      setMessage('');
    }
  };

  const handleAction = (targetId) => {
    if (!myPlayer?.isAlive) return;
    const type = myPlayer.role === 'Mafia' ? 'kill' :
      myPlayer.role === 'Doctor' ? 'save' :
        myPlayer.role === 'Detective' ? 'investigate' : 'vote';
    sendAction(currentRoom, type, targetId);
  };

  if (!joined) {
    return (
      <div className="login-screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-dark)' }}>
        <div className="card fade-in" style={{ width: '400px', textAlign: 'center' }}>
          <h1 style={{ color: 'var(--primary)', marginBottom: '1rem', letterSpacing: '4px' }}>OMERTÀ PROTOCOL</h1>
          <p style={{ color: 'var(--text-dim)', marginBottom: '2rem' }}>State-Sanctioned Social Deduction</p>

          <input
            type="text"
            placeholder="Identity / Code Name"
            className="input"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: '#252529', border: '1px solid #333', color: 'white', marginBottom: '1rem' }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <button className="btn btn-primary" onClick={handleCreate}>NEW SESSION</button>
            <form onSubmit={handleJoin}>
              <input
                type="text"
                placeholder="ENTRY CODE"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', background: '#252529', border: '1px solid #333', color: 'white', marginBottom: '0.5rem' }}
              />
              <button className="btn" style={{ background: 'var(--secondary)', color: 'white', width: '100%' }}>JOIN</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <ShieldAlert color="var(--primary)" size={32} />
          <h2 style={{ letterSpacing: '2px', fontWeight: 900 }}>OMERTÀ PROTOCOL</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div className="badge badge-town" style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>NODE: {currentRoom}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: isConnected ? 'var(--success)' : 'var(--danger)', boxShadow: isConnected ? '0 0 10px var(--success)' : 'none' }}></span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
          </div>
        </div>
      </header>

      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-dim)' }}>
          <Users size={18} />
          <span style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '1px' }}>Active Operatives</span>
        </div>

        {roomState?.players.map(player => (
          <div key={player.id} className={`player-item ${!player.isAlive ? 'dead' : ''}`} style={{ position: 'relative' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: player.id === roomState?.lastDeathId ? 'var(--danger)' : '#252529', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
              {player.isAlive ? player.name[0].toUpperCase() : <Skull size={18} color="#666" />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 500 }}>{player.name} {player.id === myPlayer?.id ? '(YOU)' : ''}</div>
              {player.role && <div style={{ fontSize: '0.65rem', color: player.role === 'Mafia' ? 'var(--primary)' : 'var(--secondary)', textTransform: 'uppercase' }}>{player.role}</div>}
            </div>
            {roomState?.phase === 'Day (Voting)' && player.isAlive && player.id !== myPlayer?.id && (
              <button className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', background: '#333', color: 'white' }} onClick={() => handleAction(player.id)}>VOTE</button>
            )}
            {roomState?.phase === 'Night (Hidden Actions)' && player.isAlive && player.id !== myPlayer?.id && (
              myPlayer?.role === 'Mafia' ? <button className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }} onClick={() => handleAction(player.id)}>ELIMINATE</button> :
                myPlayer?.role === 'Doctor' ? <button className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', background: 'var(--success)', color: 'white' }} onClick={() => handleAction(player.id)}>PROTECT</button> :
                  myPlayer?.role === 'Detective' ? <button className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', background: 'var(--secondary)', color: 'white' }} onClick={() => handleAction(player.id)}>INVESTIGATE</button> : null
            )}
          </div>
        ))}

        <div style={{ marginTop: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-dim)' }}>
            <Ghost size={18} />
            <span style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '1px' }}>Graveyard</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {roomState?.graveyard.length === 0 && <p style={{ fontSize: '0.8rem', color: '#444', fontStyle: 'italic' }}>No casualties reported...</p>}
            {roomState?.graveyard.map((name, i) => (
              <div key={i} className="badge" style={{ background: '#1a1a1e', border: '1px solid #333', color: '#777', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Skull size={10} /> {name}
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <div>
              <h3 style={{ color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '3px', marginBottom: '0.5rem' }}>
                {roomState?.phase || 'SYSTEM INITIALIZING'}
              </h3>
              <h1 style={{ fontSize: '3rem', fontWeight: 900, textTransform: 'uppercase' }}>
                {roomState?.phase === 'Lobby' ? 'STANDBY' : `PROTOCOL DAY ${roomState?.dayCount}`}
              </h1>
            </div>
          </div>

          <div className="card" style={{ borderLeft: `4px solid ${roomState?.phase.includes('Night') ? 'var(--primary)' : 'var(--secondary)'}`, background: 'rgba(31, 31, 35, 0.4)', backdropFilter: 'blur(10px)' }}>
            {roomState?.phase === 'Lobby' ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <p style={{ marginBottom: '2rem', color: 'var(--text-dim)', fontSize: '1.1rem' }}>Minimum 4 operatives required for protocol initiation.</p>
                <button className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', letterSpacing: '2px' }} onClick={() => startGame(currentRoom)}>
                  <Play size={20} inline style={{ marginRight: '10px' }} />
                  INITIATE PROTOCOL
                </button>
              </div>
            ) : roomState?.phase === 'Game Over' ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <h2 style={{ fontSize: '3rem', color: roomState.winner === 'Mafia' ? 'var(--danger)' : 'var(--success)', marginBottom: '1rem' }}>{roomState.winner.toUpperCase()} VICTORIOUS</h2>
                <button className="btn btn-primary" onClick={() => window.location.reload()}>RESET SYSTEM</button>
              </div>
            ) : (
              <div style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ marginBottom: '2rem' }}>
                  {roomState?.phase.includes('Night') ? <Skull size={64} color="var(--primary)" /> : <Users size={64} color="var(--secondary)" />}
                </div>
                <h2 style={{ marginBottom: '1rem' }}>{roomState?.phase === 'Night (Hidden Actions)' ? 'EXTRACT TARGETS' : 'IDENTIFY INFILTRATORS'}</h2>
                <p style={{ maxWidth: '500px', color: 'var(--text-dim)', marginBottom: '2rem' }}>
                  {roomState?.phase === 'Night (Hidden Actions)' ? 'The night obscures all movements. Use your tools to gain the upper hand.' : 'Discuss the evidence. Cast your vote carefully—the wrong choice could be fatal.'}
                </p>

                {roomState?.investigation && (
                  <div className="card" style={{ background: '#000', border: '1px solid var(--secondary)', color: 'var(--secondary)', padding: '1rem' }}>
                    <ShieldAlert size={16} inline style={{ marginRight: '8px' }} />
                    INTEL REVEALED: Operative is <strong>{roomState.investigation.role.toUpperCase()}</strong>
                  </div>
                )}

                <button className="btn btn-primary" onClick={() => nextPhase(currentRoom)} style={{ marginTop: '2rem' }}>
                  ADVANCE CLOCK {'->'}
                </button>
              </div>
            )}
          </div>
        </div>

        {myPlayer?.role && (
          <div className="card fade-in" style={{ position: 'absolute', bottom: '2rem', right: '2rem', borderLeft: `4px solid ${myPlayer.role === 'Mafia' ? 'var(--primary)' : 'var(--secondary)'}`, minWidth: '240px', background: 'var(--bg-card)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: '#1a1a1e', padding: '0.8rem', borderRadius: '12px' }}>
                {myPlayer.role === 'Mafia' ? <Skull color="var(--primary)" size={32} /> : <ShieldAlert color="var(--secondary)" size={32} />}
              </div>
              <div>
                <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '1px' }}>Current Designation</p>
                <h3 style={{ color: myPlayer.role === 'Mafia' ? 'var(--primary)' : 'var(--secondary)', letterSpacing: '1px' }}>{myPlayer.role.toUpperCase()}</h3>
              </div>
            </div>
          </div>
        )}
      </main>

      <section className="chat-panel">
        <div style={{ padding: '1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(22, 22, 26, 0.8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <MessageSquare size={18} color="var(--text-dim)" />
            <span style={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: '2px' }}>SECURE CHANNEL</span>
          </div>
          {myPlayer?.role === 'Mafia' && roomState?.phase === 'Night (Hidden Actions)' && <span className="badge badge-mafia" style={{ fontSize: '0.6rem' }}>MAFIA COMMS</span>}
        </div>

        <div style={{ flex: 1, padding: '1.2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {roomState?.messages.map((msg, i) => (
            <div key={i} style={{ animation: 'fadeIn 0.3s ease' }}>
              <div style={{ fontSize: '0.7rem', color: msg.type === 'mafia' ? 'var(--primary)' : 'var(--text-dim)', fontWeight: 'bold', marginBottom: '0.2rem' }}>
                {msg.sender.toUpperCase()} {msg.type === 'mafia' ? '[UNDERWORLD]' : ''}
              </div>
              <div style={{ background: msg.type === 'mafia' ? 'rgba(230, 57, 70, 0.1)' : '#1f1f23', border: `1px solid ${msg.type === 'mafia' ? 'rgba(230, 57, 70, 0.2)' : 'var(--border)'}`, padding: '0.75rem', borderRadius: '0 12px 12px 12px', fontSize: '0.9rem', color: msg.type === 'mafia' ? 'var(--primary)' : 'white' }}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={onSendChat} style={{ padding: '1.2rem', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <input
            type="text"
            placeholder="Transmit encrypted message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'var(--bg-dark)', border: '1px solid var(--border)', color: 'white', fontSize: '0.9rem', outline: 'none' }}
          />
        </form>
      </section>
    </div>
  );
}


export default App;
