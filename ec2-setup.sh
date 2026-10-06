#!/bin/bash
# AWS EC2 User Data Script for Backend Setup (Ubuntu)

# Update system
sudo apt update -y
sudo apt upgrade -y

# Install Node.js (assuming a Node backend, common with React frontends)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx to reverse proxy to your backend
sudo apt install -y nginx

# Setup firewall to allow HTTP, HTTPS, and SSH
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Create a directory for the backend app
mkdir -p /home/ubuntu/task_management_backend
chown ubuntu:ubuntu /home/ubuntu/task_management_backend

# (Optional) Provide instructions in a README on the server
cat << 'EOF' > /home/ubuntu/README.txt
Welcome to your EC2 Backend Server!

1. Upload your backend code to /home/ubuntu/task_management_backend
2. Run 'npm install' in that directory
3. Start your app with PM2: 'pm2 start index.js --name backend'
4. Configure Nginx to forward port 80 to your Node app port.
EOF
chown ubuntu:ubuntu /home/ubuntu/README.txt

echo "EC2 Setup Complete!"

