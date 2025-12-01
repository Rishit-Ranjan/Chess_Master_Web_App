import React, { useState, useEffect, useRef } from 'react';
// Function to create a simple, deterministic SVG avatar from a name
const generateLocalAvatar = (name) => {
    const getInitials = (nameStr) => {
        const names = nameStr.trim().split(' ').filter(n => n);
        if (names.length === 0)
            return 'P';
        if (names.length === 1) {
            return names[0].substring(0, 2).toUpperCase();
        }
        return (names[0][0] + (names[names.length - 1][0] || '')).toUpperCase();
    };
    const stringToHslColor = (str, s, l) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = hash % 360;
        return `hsl(${h}, ${s}%, ${l}%)`;
    };
    const initials = getInitials(name);
    const bgColor = stringToHslColor(name, 50, 40); // Dark, saturated color
    const textColor = stringToHslColor(name, 60, 85); // Lighter, complementary color
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
            <circle cx="50" cy="50" r="50" fill="${bgColor}" />
            <text x="50" y="50" font-family="Arial, sans-serif" font-size="40" dy=".3em" fill="${textColor}" text-anchor="middle">${initials}</text>
        </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
};
export const GameSetup = ({ onGameStart, playerProfile, onPlayerNameChange, onAvatarChange }) => {
    const [gameMode, setGameMode] = useState('pva');
    const [difficulty, setDifficulty] = useState('medium');
    const [humanPlayerColor, setHumanPlayerColor] = useState('w');
    const [playerName, setPlayerName] = useState(playerProfile.name);
    const [p2Name, setP2Name] = useState('Player 2');
    const [isGenerating, setIsGenerating] = useState(false);
    const fileInputRef = useRef(null);
    useEffect(() => {
        setPlayerName(playerProfile.name);
    }, [playerProfile.name]);
    const handleStart = () => {
        onPlayerNameChange(playerName);
        onGameStart(gameMode, playerName, p2Name, humanPlayerColor, difficulty);
    };
    const handleGenerateAvatar = () => {
        if (!playerName.trim()) {
            alert("Please enter your name first.");
            return;
        }
        setIsGenerating(true);
        // Simulate a short delay for better UX, as local generation is instant
        setTimeout(() => {
            try {
                const avatarDataUrl = generateLocalAvatar(playerName);
                if (avatarDataUrl) {
                    onAvatarChange(avatarDataUrl);
                }
                else {
                    alert("Failed to generate avatar. Please try again.");
                }
            }
            catch (error) {
                console.error("Local avatar generation failed:", error);
                alert("An error occurred while generating the avatar.");
            }
            finally {
                setIsGenerating(false);
            }
        }, 300);
    };
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };
    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    onAvatarChange(e.target.result);
                }
                else {
                    alert("Failed to read the avatar file.");
                }
            };
            reader.onerror = () => {
                alert("Error reading the avatar file.");
            };
            reader.readAsDataURL(file);
        }
        // Reset file input to allow re-uploading the same file
        if (event.target) {
            event.target.value = '';
        }
    };
    const isStartDisabled = (gameMode === 'pvp' && (!playerName.trim() || !p2Name.trim())) || (gameMode === 'pva' && !playerName.trim());
    return (<div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-md text-white">
            <div className="flex items-center justify-center gap-4 mb-6">
               
                <h1 className="text-4xl font-bold text-center">Chess Master</h1>
            </div>
            <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg">
                    <div className="flex-shrink-0">
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" className="hidden" aria-hidden="true"/>
                        <button onClick={handleAvatarClick} className="group w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden border-2 border-gray-600 relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500" aria-label="Change avatar">
                           {isGenerating ? (<div className="animate-pulse text-gray-400 text-sm">Generating...</div>) : playerProfile.avatar ? (<img src={playerProfile.avatar} alt="Player Avatar" className="w-full h-full object-cover"/>) : (<svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>)}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            </div>
                        </button>
                    </div>
                    <div className="flex-grow space-y-2">
                        <label htmlFor="playerName" className="block text-sm font-medium text-gray-300">Your Name</label>
                        <input type="text" id="playerName" value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:ring-indigo-500 focus:border-indigo-500"/>
                         <button onClick={handleGenerateAvatar} disabled={isGenerating || !playerName.trim()} className="w-full text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-colors">
                            {isGenerating ? 'Generating...' : 'Generate Avatar'}
                        </button>
                    </div>
                </div>


                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Game Mode</label>
                    <div className="flex rounded-md shadow-sm">
                        <button onClick={() => setGameMode('pva')} className={`flex-1 py-2 px-4 rounded-l-md transition-colors ${gameMode === 'pva' ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                            vs. Computer
                        </button>
                        <button onClick={() => setGameMode('pvo')} className={`flex-1 py-2 px-4 rounded-r-md transition-colors ${gameMode === 'pvo' ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                            vs. Online Player
                        </button>
                    </div>
                </div>

                {gameMode === 'pva' && (<>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Your Color</label>
                            <div className="flex rounded-md shadow-sm">
                                <button onClick={() => setHumanPlayerColor('w')} className={`flex-1 py-2 px-4 rounded-l-md transition-colors ${humanPlayerColor === 'w' ? 'bg-gray-200 text-black' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                    White
                                </button>
                                <button onClick={() => setHumanPlayerColor('b')} className={`flex-1 py-2 px-4 rounded-r-md transition-colors ${humanPlayerColor === 'b' ? 'bg-gray-900 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                    Black
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">AI Difficulty</label>
                            <div className="flex rounded-md shadow-sm">
                                 <button onClick={() => setDifficulty('easy')} className={`flex-1 py-2 px-4 rounded-l-md transition-colors ${difficulty === 'easy' ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}>Easy</button>
                                <button onClick={() => setDifficulty('medium')} className={`flex-1 py-2 px-4 transition-colors ${difficulty === 'medium' ? 'bg-yellow-600' : 'bg-gray-700 hover:bg-gray-600'}`}>Medium</button>
                                <button onClick={() => setDifficulty('hard')} className={`flex-1 py-2 px-4 rounded-r-md transition-colors ${difficulty === 'hard' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}>Hard</button>
                            </div>
                        </div>
                    </>)}

                {gameMode === 'pvo' && (<div>
                        <p className="text-center text-gray-400 mb-4">
                            You will be matched with a player of similar skill.
                        </p>
                        {/* The "Start Game" button below will become "Find Ranked Match" */}
                    </div>)}

                <button onClick={handleStart} disabled={isStartDisabled} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-md transition-colors text-lg disabled:bg-gray-500 disabled:cursor-not-allowed mt-4">
                    {gameMode === 'pvo' ? 'Find Ranked Match' : 'Start Game'}
                </button>
            </div>
        </div>);
};
