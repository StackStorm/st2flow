# st2flow - StackStorm Workflow Editor

> **DEPRECATED!**<br> 
> The Workflow Designer codebase was integrated directly into [st2web](https://github.com/StackStorm/st2web/) since st2 `v3.4.0` (see [announcement](https://stackstorm.com/2021/03/04/v3-4-0-released/)) and this repository is obsolete now.


Visual editor for creating and updating StackStorm workflows. This editor is currently only available for enterprise licenses.

## Requirements

- Node v10
- Lerna, Yarn, and Gulp

    ```
    sudo npm install -g gulp-cli lerna yarn
    ```

## Installation

This project uses Lerna and should be considered a "subset" of the [st2web](https://github.com/StackStorm/st2web) project. It is currently required that the st2web repo be cloned next to the st2flow repo:

```
├── StackStorm
|   ├── st2flow
|   └── st2web
```

Here is the basic flow of commands to get started:

```
git clone git@github.com:StackStorm/st2web.git
# ...or https: https://github.com/StackStorm/st2web.git

cd st2web
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

Copyright 2015-2020 Extreme Networks, Inc.

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this work except in compliance with the License. You may obtain a copy of the License in the [LICENSE](LICENSE) file, or at:

[http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

By contributing you agree that these contributions are your own (or approved by your employer) and you grant a full, complete, irrevocable copyright license to all users and developers of the project, present and future, pursuant to the license of the project.
