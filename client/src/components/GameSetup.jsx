import React, { useState, useEffect, useRef } from 'react';
import { getUserProfile, updateUserProfile, registerUser, loginUser } from '../services/apiService.js';
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
export const GameSetup = ({ onGameStart, playerProfile, setPlayerProfile, onPlayerNameChange, onAvatarChange, onToggleTheme }) => {
    const [gameMode, setGameMode] = useState('pva');
    const [subMode, setSubMode] = useState('create'); // 'create' or 'join' for pvf
    const [joinGameId, setJoinGameId] = useState('');
    const [difficulty, setDifficulty] = useState('medium');
    const [timeControl, setTimeControl] = useState(10); // Default 10 minutes
    const [humanPlayerColor, setHumanPlayerColor] = useState('w');
    const [playerName, setPlayerName] = useState(playerProfile.name);
    const [password, setPassword] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [authMode, setAuthMode] = useState('register'); // 'register' or 'login'
    // State to control the visibility of the profile modal
    const [isProfileVisible, setIsProfileVisible] = useState(!playerProfile.id); // Show profile modal if no user is "logged in"
    const fileInputRef = useRef(null);

    useEffect(() => {
        setPlayerName(playerProfile.name);
    }, [playerProfile.name]);

    // Simulate login/profile fetch
    useEffect(() => {
        // This effect now only ensures the modal is visible if no user is loaded.
        if (!playerProfile.id) {
            setIsProfileVisible(true);
        }
    }, [playerProfile.id]);

    const handleStart = () => {
        onPlayerNameChange(playerName);
        // For Play with Friend, we pass extra data
        const profile = { ...playerProfile, name: playerName };
        if (gameMode === 'pvf') {
            const creatorColor = subMode === 'create' ? (Math.random() > 0.5 ? 'w' : 'b') : humanPlayerColor;
            // Pass timeControl in the profile or as a separate argument. 
            // Here we pass it as a separate argument to onGameStart
            onGameStart(gameMode, profile, null, creatorColor, difficulty, { subMode, joinGameId, timeControl });
        } else {
            onGameStart(gameMode, profile, 'Player 2', humanPlayerColor, difficulty, { timeControl });
        }
    };

    const handleGenerateAvatar = () => {
        if (!playerName.trim()) {
            alert("Please enter your name first.");
            return;
        }
        setIsGenerating(true);
        setTimeout(() => {
            try {
                const avatarDataUrl = generateLocalAvatar(playerName);
                if (avatarDataUrl) {
                    // Update on server first
                    updateUserProfile(playerProfile.id, { avatar: avatarDataUrl }).then(() => {
                        onAvatarChange(avatarDataUrl);
                    }).catch(err => {
                        alert("Failed to update avatar on server.");
                    });
                } else {
                    alert("Failed to generate avatar. Please try again.");
                }
            } catch (error) {
                console.error("Local avatar generation failed:", error);
                alert("An error occurred while generating the avatar.");
            } finally {
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
                    // Update on server first
                    updateUserProfile(playerProfile.id, { avatar: e.target.result }).then(() => {
                        onAvatarChange(e.target.result);
                    }).catch(err => {
                        alert("Failed to update avatar on server.");
                    });
                } else {
                    alert("Failed to read the avatar file.");
                }
            };
            reader.onerror = () => {
                alert("Error reading the avatar file.");
            };
            reader.readAsDataURL(file);
        }
        if (event.target) {
            event.target.value = '';
        }
    };

    const isStartDisabled =
        !playerName.trim() ||
        (gameMode === 'pvf' && subMode === 'join' && !joinGameId.trim());

    const handleNameBlur = () => {
        if (playerName !== playerProfile.name && playerProfile.id) {
            updateUserProfile(playerProfile.id, { name: playerName })
                .then(() => {
                    onPlayerNameChange(playerName);
                }).catch(err => {
                    alert("Failed to update name on server.");
                });
        }
    };

    const handleRegister = async () => {
        if (!playerName.trim() || !password.trim()) {
            alert('Please enter a name and password to register.');
            return;
        }
        try {
            const registerResponse = await registerUser({ name: playerName, password });
            const newUserId = registerResponse.data.id;

            if (newUserId) {
                // After successful registration, fetch the full new profile
                const profileResponse = await getUserProfile(newUserId);
                setPlayerProfile(profileResponse.data);
                setIsProfileVisible(false); // Close the modal
                alert('Registration successful!');
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'An error occurred during registration.';
            console.error("Registration failed:", error);
            alert(`Registration failed: ${errorMessage}`);
        }
    };

    const handleLogin = async () => {
        if (!playerName.trim() || !password.trim()) {
            alert('Please enter a name and password to log in.');
            return;
        }
        try {
            const response = await loginUser({ name: playerName, password });
            setPlayerProfile(response.data);
            setIsProfileVisible(false); // Close the modal
            alert('Login successful!');
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'An error occurred during login.';
            console.error("Login failed:", error);
            alert(`Login failed: ${errorMessage}`);
        }
    };

    return (
        <div className="bg-white/80 dark:bg-gray-900/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-lg text-gray-800 dark:text-white border border-gray-300 dark:border-gray-700/50">
            <div className="flex justify-between items-start mb-8">
                {/* Left spacer to balance the layout */}
                <div className="w-28"></div>
                <div className="text-center">
                    <h1 className="text-5xl font-extrabold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent mb-2">Chess Master</h1>
                    <p className="text-gray-400">Choose your battleground</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Theme Toggle Button */}
                    <button onClick={onToggleTheme} className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-indigo-500/50 hover:border-indigo-500 transition-all text-xl">
                        <span className="dark:hidden">🌙</span>
                        <span className="hidden dark:inline">☀️</span>
                    </button>
                    {/* Profile icon button */}
                    <button onClick={() => setIsProfileVisible(true)} className="w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-500/50 hover:border-indigo-500 transition-all shadow-lg shadow-indigo-500/20">
                        {playerProfile.avatar ? (
                            <img src={playerProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : ( // Default icon for profile button
                            <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                <span className="text-xl">👤</span>
                            </div>
                        )}
                    </button>
                </div>
            </div>

            <div className="space-y-8">
                {/* Game Mode Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Select Game Mode</label>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { id: 'pva', label: 'vs Computer', icon: '🤖' },
                            { id: 'pvo', label: 'Ranked', icon: '🏆' },
                            { id: 'pvf', label: 'Play Friend', icon: '👥' }
                        ].map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => setGameMode(mode.id)}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${gameMode === mode.id
                                    ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-500/30 transform scale-105 text-white'
                                    : 'bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700 hover:bg-gray-300 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                                    }`}
                            >
                                <span className="text-2xl mb-1">{mode.icon}</span>
                                <span className={`text-xs font-bold ${gameMode === mode.id ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>{mode.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mode Specific Options */}
                <div className="bg-gray-200/50 dark:bg-gray-800/30 rounded-xl p-4 border border-gray-300/50 dark:border-gray-700/50 min-h-[120px] flex flex-col justify-center">
                    {gameMode === 'pva' && (
                        <div className="space-y-4 animate-fadeIn">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-400">Difficulty</span>
                                <div className="flex bg-gray-900 rounded-lg p-1">
                                    {['easy', 'medium', 'hard'].map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setDifficulty(d)}
                                            className={`px-3 py-1 rounded-md text-xs font-bold capitalize transition-all ${difficulty === d
                                                ? (d === 'easy' ? 'bg-green-600 text-white' : d === 'medium' ? 'bg-yellow-500 text-white' : 'bg-red-600 text-white')
                                                : 'text-gray-400 hover:text-white'
                                                }`}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-400">Play As</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setHumanPlayerColor('w')} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${humanPlayerColor === 'w' ? 'border-indigo-500 bg-white text-black' : 'border-gray-600 bg-gray-300 text-gray-500'}`}>♔</button>
                                    <button onClick={() => setHumanPlayerColor('b')} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${humanPlayerColor === 'b' ? 'border-indigo-500 bg-black text-white' : 'border-gray-600 bg-gray-800 text-gray-500'}`}>♚</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {gameMode === 'pvo' && (
                        <div className="text-center animate-fadeIn">
                            <p className="text-sm text-gray-300">Find a worthy opponent online.</p>
                            <p className="text-xs text-gray-500 mt-1">Matchmaking based on your wins.</p>
                        </div>
                    )}

                    {gameMode === 'pvf' && (
                        <div className="space-y-4 animate-fadeIn">
                            <div className="flex bg-gray-900 rounded-lg p-1">
                                <button onClick={() => setSubMode('create')} className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${subMode === 'create' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Create Game</button>
                                <button onClick={() => setSubMode('join')} className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${subMode === 'join' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>Join Game</button>
                            </div>

                            {subMode === 'create' ? (
                                <div className="text-center text-sm text-gray-400">
                                    Start a game and share the code with a friend.
                                </div>
                            ) : (
                                <div>
                                    <input
                                        type="text"
                                        value={joinGameId}
                                        onChange={(e) => setJoinGameId(e.target.value)}
                                        placeholder="Enter Game Code"
                                        className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-800 dark:text-white text-center tracking-widest placeholder-gray-500 dark:placeholder-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Time Control Selection */}
                {gameMode !== 'pvo' && (
                    <div className="bg-gray-200/50 dark:bg-gray-800/30 rounded-xl p-4 border border-gray-300/50 dark:border-gray-700/50 mt-4">
                        <span className="text-sm text-gray-400 block mb-2">Time Control</span>
                        <div className="flex gap-2">
                            {[
                                { label: '1 min', value: 1 },
                                { label: '3 min', value: 3 },
                                { label: '5 min', value: 5 },
                                { label: '10 min', value: 10 },
                                { label: '30 min', value: 30 },
                            ].map((tc) => (
                                <button
                                    key={tc.value}
                                    onClick={() => setTimeControl(tc.value)}
                                    className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${timeControl === tc.value
                                        ? 'bg-indigo-600 text-white shadow'
                                        : 'bg-gray-900 text-gray-400 hover:text-white'
                                        }`}
                                >
                                    {tc.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Start Game Button */}
                <button
                    onClick={handleStart}
                    disabled={isStartDisabled}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-indigo-600/20 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                >
                    {gameMode === 'pvo' ? 'Find Match' : gameMode === 'pvf' && subMode === 'create' ? 'Create & Play' : gameMode === 'pvf' && subMode === 'join' ? 'Join Game' : 'Start Game'}
                </button>
            </div>

            {/* Profile Modal */}
            {isProfileVisible && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsProfileVisible(false)}>
                    <div className="relative w-full max-w-md bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-2xl shadow-2xl border border-gray-300 dark:border-gray-700 p-6 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setIsProfileVisible(false)}
                            className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl"
                            aria-label="Close profile"
                        >
                            &times;
                        </button>

                        {!playerProfile.id && (
                            <div className="flex bg-gray-200 dark:bg-gray-900 rounded-lg p-1 mb-6">
                                <button onClick={() => setAuthMode('register')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${authMode === 'register' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'}`}>
                                    Register
                                </button>
                                <button onClick={() => setAuthMode('login')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${authMode === 'login' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'}`}>
                                    Login
                                </button>
                            </div>
                        )}

                        <h2 className="text-2xl font-bold text-center text-indigo-400 mb-6">{playerProfile.id ? 'Your Profile' : (authMode === 'register' ? 'Create Your Profile' : 'Login to Your Profile')}</h2>

                        {/* Profile Details (moved from main GameSetup) */}
                        <div className="p-4 bg-gray-100/50 dark:bg-gray-800/50 rounded-xl border border-gray-300 dark:border-gray-700">
                            <div className="flex items-center gap-4 mb-4">
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" className="hidden" />
                                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-indigo-500/50 group-hover:border-indigo-500 transition-all shadow-lg shadow-indigo-500/20 flex-shrink-0 group">
                                    <button onClick={handleAvatarClick} className="w-full h-full">
                                        {isGenerating ? (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-800 text-xs text-indigo-400 animate-pulse">Generating...</div>
                                        ) : playerProfile.avatar ? (
                                            <img src={playerProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : ( // Default icon for modal avatar
                                            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                                <span className="text-2xl">👤</span>
                                            </div>
                                        )}
                                    </button>
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        <span className="text-white text-xs font-bold">EDIT</span>
                                    </div>
                                </div>
                                <div className="flex-grow space-y-2">
                                    <div>
                                        <label className="text-xs text-gray-400">Name</label>
                                        <input
                                            type="text"
                                            value={playerName}
                                            onChange={(e) => setPlayerName(e.target.value)}
                                            onBlur={handleNameBlur}
                                            className="w-full bg-gray-200 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-800 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-base font-bold"
                                            placeholder="Enter your name"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400">Password</label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-gray-200 dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-800 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                            placeholder={authMode === 'register' ? "Create a password" : "Enter your password"}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-400">Rank: <span className="font-bold text-indigo-400">{playerProfile.rank ?? 'Unranked'}</span></span>
                                        <button
                                            onClick={handleGenerateAvatar}
                                            disabled={isGenerating || !playerName.trim()}
                                            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors disabled:opacity-50"
                                        >
                                            {isGenerating ? 'Generating...' : 'Generate Avatar'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-300/50 dark:border-gray-700/50">
                                <div className="text-center">
                                    <div className="text-xs text-gray-500 uppercase">Wins</div>
                                    <div className="font-bold text-green-400">{playerProfile.score?.wins ?? 0}</div>
                                </div>
                                <div className="text-center border-l border-r border-gray-300/50 dark:border-gray-700/50">
                                    <div className="text-xs text-gray-500 uppercase">Losses</div>
                                    <div className="font-bold text-red-400">{playerProfile.score?.losses ?? 0}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs text-gray-500 uppercase">Draws</div>
                                    <div className="font-bold text-gray-400">{playerProfile.score?.draws ?? 0}</div>
                                </div>
                            </div>
                        </div>
                        {!playerProfile.id && (
                            <button
                                onClick={authMode === 'register' ? handleRegister : handleLogin}
                                className="w-full mt-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-green-600/20 transition-all"
                            >
                                {authMode === 'register' ? 'Register & Login' : 'Login'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
