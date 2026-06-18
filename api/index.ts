import { ParameterType, ToolsService, tool } from '@optimizely-opal/opal-tools-sdk';
import express from 'express';
import { URLSearchParams } from 'node:url';

interface WeatherParameters {
  city: string;
  state?: string;
  country: string;
  units?: string;
}

interface WeatherResponse {
  temperature: number;
  condition: string;
  location: string;
}

const app = express();
app.use(express.json());

// Optional root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '✅ Opal Weather Tool is running',
    discovery: '/api/discovery'
  });
});

// Register with Opal
new ToolsService(app);

class WeatherTools {
  @tool({
    name: 'get_weather',
    description: 'Gets current weather for a location.',
    parameters: [
      { name: 'city', type: ParameterType.String, required: true },
      { name: 'state', type: ParameterType.String, required: false },
      { name: 'country', type: ParameterType.String, required: true },
      { name: 'units', type: ParameterType.String, required: false }
    ]
  })
  async getWeather(parameters: WeatherParameters): Promise<WeatherResponse> {

    const { city, state, country, units = '' } = parameters;

    if (!city?.trim() || !country?.trim()) {
      throw new Error('City and Country are required.');
    }

    const apiUrl = 'https://api.openweathermap.org/data/2.5/weather';

    let weatherData: WeatherResponse = {
      temperature: units?.toLowerCase() === 'imperial' ? 72 : 22,
      condition: 'Sunny',
      location: `${city}${state ? `, ${state}` : ''}, ${country}`
    };

    if (process.env.OPENWEATHERMAP_API_KEY?.trim()) {

      const q = new URLSearchParams();

      if (state) {
        q.append('q', `${city},${state},${country}`);
      } else {
        q.append('q', `${city},${country}`);
      }

      if (units) {
        q.append('units', units.toLowerCase());
      }

      q.append('appid', process.env.OPENWEATHERMAP_API_KEY);

      const response = await fetch(`${apiUrl}?${q}`);

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const result = await response.json();

      weatherData = {
        temperature: result.main.temp,
        condition: result.weather[0].main +
          (result.weather[0].description
            ? ` (${result.weather[0].description})`
            : ''),
        location: `${result.name}, ${result.sys.country}`
      };
    }

    return weatherData;
  }
}

export default app;
