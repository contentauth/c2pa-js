module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
	moduleNameMapper: {
		"index\\.node": "<rootDir>/index.node"
	},
	// Force Jest to exit after tests complete to prevent hanging
	forceExit: true
};
