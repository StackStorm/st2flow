# st2flow - StackStorm Workflow Editor

[![CircleCI](https://circleci.com/gh/StackStorm/st2flow.svg?style=shield&circle-token=3bfc47f8b1f7af9c1845ea79df2c18e0f32cc509)](https://circleci.com/gh/StackStorm/st2web)

Visual editor for creating and updating StackStorm workflows. This editor is currently only available for enterprise licenses.

## Requirements

- Node v10
- Lerna, Yarn, and Gulp
    
    ```
    sudo npm install -g gulp-cli lerna yarn
    ```

## Installation

This project uses Lerna and should be considered a "subset" of the [st2flow](https://github.com/StackStorm/st2web) project. It is currently required that the st2web repo be cloned next to the st2flow repo:

```
├── StackStorm
|   ├── st2flow
|   └── st2flow
```

Here is the basic flow of commands to get started:

```
git clone git@github.com:StackStorm/st2flow.git
# ...or https: https://github.com/StackStorm/st2flow.git

cd st2flow
lerna bootstrap

cd ../
git clone git@github.com:StackStorm/st2flow.git
# ...or https: https://github.com/StackStorm/st2flow.git

cd st2flow
lerna bootstrap
```

## Running the app and tests

```
# Run the app, available on http://localhost:3000
# Note, it takes ~10 - 20s to get running but then you're in watch mode
gulp

# Run unit tests
gulp test-unit

# Linting
gulp lint
```
