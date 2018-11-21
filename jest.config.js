module.exports = {
    "roots": [
      "<rootDir>/src"
    ],    
    "collectCoverageFrom": ["src/**/*.{ts,js}"],
    "transform": {
        "^.+\\.tsx?$": "ts-jest"
    },
    "testRegex": "(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",
    "moduleFileExtensions": [
        "ts",
        "tsx",
        "js",
        "jsx",
        "json",
        "node"
    ],
}