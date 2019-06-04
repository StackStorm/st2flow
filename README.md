# st2flow - StackStorm Workflow Editor

[![CircleCI](https://circleci.com/gh/StackStorm/st2flow.svg?style=shield&circle-token=ab4b62655342fb8d0f1abbb7c5ec3e92425a71b8)](https://circleci.com/gh/StackStorm/st2flow)

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

## Copyright, License, and Contributors Agreement

Copyright 2015-2019 Extreme Networks, Inc.

Unauthorized copying of this file, via any medium is strictly prohibited. Proprietary and confidential. See the [LICENSE](LICENSE) file included with this work for details.

By contributing you agree that these contributions are your own (or approved by your employer) and you grant a full, complete, irrevocable copyright license to all users and developers of the project, present and future, pursuant to the license of the project.
