# Step 1: Node.js ka stable lightweight version use kar rahe hain
FROM node:20-slim

# Step 2: Hugging Face ki security policy ke mutabiq non-root user (UID 1000) banana zaroori hai
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Step 3: Container ke andar app ka directory setup
WORKDIR $HOME/app

# Step 4: Pehle package files copy karke dependencies install karenge (Caching ke liye behtar hai)
COPY --chown=user package*.json ./
RUN npm ci --only=production

# Step 5: Baki saara project ka code copy karein safely
COPY --chown=user . .

# Step 6: Hugging Face ka internal port expose karein
EXPOSE 7860

# Step 7: Server start karne ki command
CMD ["npm", "start"]