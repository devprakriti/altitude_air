#!/bin/bash

# Heli Monorepo Deployment Script
set -e

echo "🚀 Starting Heli deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_error "PM2 is not installed. Please install it first:"
    echo "npm install -g pm2"
    exit 1
fi

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    print_error "Bun is not installed. Please install it first:"
    echo "curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Install dependencies
print_status "Installing dependencies..."
bun install

# Build server
print_status "Building server..."
cd apps/server
bun run compile
cd ../..

# Build web
print_status "Building web application..."
cd apps/web
bun run build
cd ../..

# Stop existing PM2 processes
print_status "Stopping existing PM2 processes..."
# First, try to stop processes by name (safer than using ecosystem file)
pm2 stop heli-server --silent 2>/dev/null || true
pm2 stop heli-web --silent 2>/dev/null || true
# Then delete them
pm2 delete heli-server --silent 2>/dev/null || true
pm2 delete heli-web --silent 2>/dev/null || true

# Validate ecosystem configuration
print_status "Validating ecosystem configuration..."
if ! node -c ecosystem.config.cjs; then
    print_error "Invalid ecosystem configuration file"
    exit 1
fi

# Start applications with PM2
print_status "Starting applications with PM2..."
if ! pm2 start ecosystem.config.cjs; then
    print_error "Failed to start applications with PM2"
    print_status "Attempting to start applications individually..."
    pm2 start ecosystem.config.cjs --only heli-server
    pm2 start ecosystem.config.cjs --only heli-web
fi

# Save PM2 configuration
print_status "Saving PM2 configuration..."
pm2 save

# Setup PM2 startup (optional - uncomment if you want PM2 to start on boot)
# print_status "Setting up PM2 startup..."
# pm2 startup

print_status "Deployment completed successfully! 🎉"
echo ""
echo "📊 Application Status:"
pm2 status
echo ""
echo "📝 Useful commands:"
echo "  pm2 status          - Check application status"
echo "  pm2 logs            - View logs"
echo "  pm2 restart all     - Restart all applications"
echo "  pm2 stop all        - Stop all applications"
echo "  pm2 monit           - Monitor applications"
