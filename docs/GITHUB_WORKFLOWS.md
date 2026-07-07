# GitHub Workflows Setup

Due to GitHub App permission restrictions, the CI/CD workflows need to be added manually. This guide provides the workflow files and instructions.

## Creating Workflows

1. Create `.github/workflows/` directory if it doesn't exist
2. Add the two workflow files below

## Workflow 1: Test Pipeline

**File:** `.github/workflows/test.yml`

```yaml
name: Test

on:
  push:
    branches: [main, production-ready-app]
  pull_request:
    branches: [main, production-ready-app]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm run build

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v3
        if: always()
        with:
          files: ./coverage/coverage-final.json
```

## Workflow 2: Build & Deploy

**File:** `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm run validate

      - name: Build Docker image
        run: docker build -t v03:${{ github.sha }} -t v03:latest .

      - name: Push to registry
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push v03:${{ github.sha }}
          docker push v03:latest

      - name: Deploy to production
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
        run: |
          mkdir -p ~/.ssh
          echo "$DEPLOY_KEY" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H $DEPLOY_HOST >> ~/.ssh/known_hosts
          ssh -i ~/.ssh/deploy_key deploy@$DEPLOY_HOST \
            "cd /app && docker pull v03:latest && docker-compose up -d"
```

## Setup Instructions

1. **Add Workflow Files Manually:**
   ```bash
   mkdir -p .github/workflows
   # Copy the YAML content from above into these files:
   # - .github/workflows/test.yml
   # - .github/workflows/deploy.yml
   ```

2. **Configure Secrets (for deploy workflow):**
   - `DOCKER_USERNAME` - Docker Hub username
   - `DOCKER_PASSWORD` - Docker Hub password/token
   - `DEPLOY_KEY` - SSH private key for deployment server
   - `DEPLOY_HOST` - Deployment server hostname

3. **Or Grant v0 App Permission:**
   - Go to GitHub Settings → Integrations & applications → GitHub Apps
   - Find the v0 app
   - Add `workflows` permission
   - Then v0 can create/update workflows automatically

## Testing Workflows Locally

Use `act` to test workflows locally:

```bash
# Install act: https://github.com/nektos/act
act push -j lint
act push -j test
act push -j build
```

## Alternative: Use v0.dev to Generate Workflows

You can also use v0 to generate workflow files once the permission is granted, or manually maintain them using the templates above.
