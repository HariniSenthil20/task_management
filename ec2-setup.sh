#!/bin/bash
# AWS EC2 User Data Script for Java Backend Setup (Ubuntu)

# Update system
sudo apt update -y
sudo apt upgrade -y

# Install Java 17 (OpenJDK)
sudo apt install -y openjdk-17-jdk

# Install Maven (optional, in case you want to build on the server)
sudo apt install -y maven

# Install Nginx to reverse proxy to your backend
sudo apt install -y nginx

# Setup firewall to allow HTTP, HTTPS, and SSH
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Create a directory for the backend app
mkdir -p /home/ubuntu/task_management_backend
chown ubuntu:ubuntu /home/ubuntu/task_management_backend

# Provide instructions in a README on the server
cat << 'EOF' > /home/ubuntu/README.txt
Welcome to your EC2 Java Backend Server!

1. Upload your backend code or compiled .jar file to /home/ubuntu/task_management_backend
2. If uploading source code, build it using: 'mvn clean package'
3. Run your Java app using: 'java -jar target/your-app-name.jar &'
   (Consider setting up a systemd service to keep it running 24/7)
4. Configure Nginx to forward port 80 to your Java app's port (e.g., 8080).
EOF
chown ubuntu:ubuntu /home/ubuntu/README.txt

echo "EC2 Setup Complete!"
