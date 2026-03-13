# Fitness Tracker

A comprehensive, offline-first cross-platform fitness and nutrition tracking application designed with a minimalist, high-contrast aesthetic.

**[Try the Live App Here](https://fitnesstracker.raehanbopitiya.workers.dev/)**

## Features

* **Smart Nutrition Tracking:** Log meals and track daily macronutrients (Protein, Carbs, Fats) and calories against personalized targets using dynamic visual rings.
* **Intelligent Workout Logging:** Record strength training, running, and general workouts. Calculates estimated calories burned using Metabolic Equivalent of Task (MET) values based on real-time body weight.
* **Advanced Analytics:** Visualize your consistency and trends with custom-built SVG charts, including dual-bar calorie comparisons, rolling average trendlines, and a dynamic activity heatmap.
* **Progress & Records:** Track body weight history and automatically highlight Personal Bests for lifting and running metrics.
* **Algorithmic Profiling:** Automatically calculates Basal Metabolic Rate and recommended macro splits utilizing the Mifflin St Jeor equation and user-selected activity multipliers.
* **Data Ownership:** Fully offline-first architecture with local storage. Includes features to export and import complete database backups via JSON.

## Tech Stack

* **Frontend Framework:** React Native, Expo, Expo Router
* **Languages:** TypeScript, JavaScript
* **State Management:** Zustand
* **Data Visualization:** React Native SVG
* **Storage:** Local database management

## Getting Started

### Prerequisites
Ensure you have Node.js and npm installed on your local machine.

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd fitnesstracker