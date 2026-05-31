# Step 1: Base image
FROM node:20-slim

# Step 2: Hugging Face permission layer (Jo pre-existing 'node' user use karegi)
# Kyunki UID 1000 pehle se 'node' user ke paas hai, hum usi ko set kar rahe hain
ENV HOME=/home/node \
    PATH=/home/node/.local/bin:$PATH

WORKDIR $HOME/app

# Step 3: Dependencies install karein safely
COPY --chown=node:node package*.json ./
RUN npm ci --only=production

# Step 4: Pura code copy karein properly owned by 'node' user
COPY --chown=node:node . .

# Step 5: Switch to user 1000 (node) for security
USER 1000

# Step 6: Port exposure
EXPOSE 7860

# Step 7: Execution script
CMD ["npm", "start"]