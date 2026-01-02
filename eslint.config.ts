import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import ts from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import pluginImports from "eslint-plugin-unused-imports";

export default defineConfig([
    globalIgnores([
        "dist",
        "coverage"
    ]),
    js.configs.recommended,
    ts.configs.recommended,
    { // Imports management
        plugins: {
            "@imports": pluginImports
        },
        rules: {
            "@imports/no-unused-imports": "error",
            "@imports/no-unused-vars": [ "warn", {
                vars: "all",
                varsIgnorePattern: "^_",
                args: "after-used",
                argsIgnorePattern: "^_"
            }]
        }
    },
    { // Sylistics
        extends: [
            stylistic.configs.customize({
                indent: 4,
                braceStyle: "1tbs",
                quotes: "double",
                semi: true,
                commaDangle: "never"
            })
        ],
        plugins: {
            "@stylistic": stylistic
        },
        rules: {
            "@stylistic/array-bracket-spacing": [
                "error",
                "always",
                {
                    objectsInArrays: false,
                    arraysInArrays: false
                }
            ],
            "@stylistic/curly-newline": [ "error", { consistent: true }],
            "@stylistic/comma-style": [ "error", "last" ],
            "@stylistic/no-extra-semi": "error",
            "@stylistic/object-curly-spacing": [ "error", "always" ]
        }
    }
]);
