const { MongoClient } = require('mongodb');

//const uri = 'mongodb+srv://<username>:<password>@cluster0.mongodb.net/eventagrate?retryWrites=true&w=majority';
const uri = 'mongodb://admin:p4ss12345@3.28.242.172:27017/pricing?authSource=admin';
const client = new MongoClient(uri);

async function insertProviders() {
  try {
    await client.connect();
    const db = client.db('eventagrate');
    const providersCollection = db.collection('providers');

    const providers = [
      {
        name: 'Google Cloud Run',
        inputs: [
          { name: 'vCPU_seconds', label: 'vCPU Seconds', type: 'number' },
          { name: 'GiB_seconds', label: 'GiB Seconds', type: 'number' },
          { name: 'Requests', label: 'Requests', type: 'number' },
          { name: 'Region', label: 'Region', type: 'text' },
          { name: 'Concurrency', label: 'Concurrency', type: 'number' },
        ],
      },
      {
        name: 'Google Cloud Storage',
        inputs: [
          { name: 'Storage_GB', label: 'Storage (GB)', type: 'number' },
          { name: 'Data_transfer_out_GB', label: 'Data Transfer Out (GB)', type: 'number' },
          { name: 'Operations_class_A', label: 'Class A Operations', type: 'number' },
          { name: 'Operations_class_B', label: 'Class B Operations', type: 'number' },
          { name: 'Region', label: 'Region', type: 'text' },
        ],
      },
      {
        name: 'Google Cloud CDN',
        inputs: [
          { name: 'Cache_egress_GB', label: 'Cache Egress (GB)', type: 'number' },
          { name: 'HTTP_requests', label: 'HTTP Requests', type: 'number' },
          { name: 'Region', label: 'Region', type: 'text' },
          { name: 'Cache_fill_GB', label: 'Cache Fill (GB)', type: 'number' },
        ],
      },
      {
        name: 'Google Cloud Load Balancing',
        inputs: [
          { name: 'Forwarding_rules', label: 'Forwarding Rules', type: 'number' },
          { name: 'Data_processed_GB', label: 'Data Processed (GB)', type: 'number' },
          { name: 'Region', label: 'Region', type: 'text' },
          { name: 'Load_balancer_type', label: 'Load Balancer Type', type: 'text' },
        ],
      },
      {
        name: 'MongoDB Atlas',
        inputs: [
          { name: 'Cluster_tier', label: 'Cluster Tier', type: 'text' },
          { name: 'Storage_GB', label: 'Storage (GB)', type: 'number' },
          { name: 'Data_transfer_out_GB', label: 'Data Transfer Out (GB)', type: 'number' },
          { name: 'Region', label: 'Region', type: 'text' },
          { name: 'Backup_usage', label: 'Backup Usage', type: 'text' },
        ],
      },
      {
        name: 'Vercel',
        inputs: [
          { name: 'Build_execution_minutes', label: 'Build Execution Minutes', type: 'number' },
          { name: 'Bandwidth_GB', label: 'Bandwidth (GB)', type: 'number' },
          { name: 'Serverless_invocations', label: 'Serverless Invocations', type: 'number' },
          { name: 'Team_seats', label: 'Team Seats', type: 'number' },
          { name: 'Plan_type', label: 'Plan Type', type: 'text' },
        ],
      },
      {
        name: 'Ably',
        inputs: [
          { name: 'Connection_hours', label: 'Connection Hours', type: 'number' },
          { name: 'Messages', label: 'Messages', type: 'number' },
          { name: 'Peak_connections', label: 'Peak Connections', type: 'number' },
          { name: 'Channels', label: 'Channels', type: 'number' },
          { name: 'Plan_type', label: 'Plan Type', type: 'text' },
        ],
      },
      {
        name: 'Agora',
        inputs: [
          { name: 'Audio_minutes', label: 'Audio Minutes', type: 'number' },
          { name: 'Video_HD_minutes', label: 'Video HD Minutes', type: 'number' },
          { name: 'Video_720p_minutes', label: 'Video 720p Minutes', type: 'number' },
          { name: 'Users', label: 'Users', type: 'number' },
        ],
      },
      {
        name: 'Mixpanel',
        inputs: [
          { name: 'Events', label: 'Events', type: 'number' },
          { name: 'User_profiles', label: 'User Profiles', type: 'number' },
          { name: 'Reports', label: 'Reports', type: 'number' },
          { name: 'Sessions', label: 'Sessions', type: 'number' },
          { name: 'Plan_type', label: 'Plan Type', type: 'text' },
        ],
      },
      {
        name: 'Segment',
        inputs: [
          { name: 'MTUs', label: 'MTUs', type: 'number' },
          { name: 'Connections', label: 'Connections', type: 'number' },
          { name: 'Destinations', label: 'Destinations', type: 'number' },
          { name: 'Users', label: 'Users', type: 'number' },
          { name: 'Plan_type', label: 'Plan Type', type: 'text' },
        ],
      },
      {
        name: 'Resend',
        inputs: [
          { name: 'Emails_sent', label: 'Emails Sent', type: 'number' },
          { name: 'Contacts', label: 'Contacts', type: 'number' },
          { name: 'Domains', label: 'Domains', type: 'number' },
          { name: 'API_calls', label: 'API Calls', type: 'number' },
        ],
      },
      {
        name: 'ElevenLabs Speech to Text',
        inputs: [
          { name: 'Audio_seconds', label: 'Audio Seconds', type: 'number' },
          { name: 'Model_type', label: 'Model Type', type: 'text' },
          { name: 'Language', label: 'Language', type: 'text' },
          { name: 'API_calls', label: 'API Calls', type: 'number' },
        ],
      },
      {
        name: 'OpenAI Whisper Text to Speech',
        inputs: [
          { name: 'Characters_processed', label: 'Characters Processed', type: 'number Allegh

System: It looks like the artifact for `insert_providers.js` was cut off. I'll complete the MongoDB insertion script to include all 17 providers from the CSV template, ensuring all input fields are correctly defined. Additionally, I’ll ensure the project remains consistent with your requirements: MongoDB for storing providers and input fields, dynamic field rendering, no cost display before the report, no hardcoded pricing rates, and costs only in the Grok-generated report. The other artifacts (`app/page.tsx`, `app/api/calculate/route.ts`, `app/api/report/route.ts`, `app/api/providers/route.ts`, `lib/mongodb.ts`, `.env.local`) are correct and will be reused as provided, with the incomplete `insert_providers.js` replaced.

### Completed Artifact for MongoDB Data Insertion

Below is the complete `insert_providers.js` script to populate the `providers` collection in MongoDB with all 17 providers and their input fields from the CSV template.

<xaiArtifact artifact_id="3a3a1239-4057-435f-9723-2c2094732f68" artifact_version_id="56090a0e-b5c8-4946-8de4-f69ee7c1942c" title="insert_providers.js" contentType="text/javascript">
const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://<username>:<password>@cluster0.mongodb.net/eventagrate?retryWrites=true&w=majority';
const client = new MongoClient(uri);

async function insertProviders() {
  try {
    await client.connect();
    const db = client.db('eventagrate');
    const providersCollection = db.collection('providers');

    const providers = [
      {
        name: 'Google Cloud Run',
        inputs: [
          { name: 'vCPU_seconds', label: 'vCPU Seconds', type: 'number' },
          { name: 'GiB_seconds', label: 'GiB Seconds', type: 'number' },
          { name: 'Requests', label: 'Requests', type: 'number' },
          { name: 'Region', label: 'Region', type: 'text' },
          { name: 'Concurrency', label: 'Concurrency', type: 'number' },
        ],
      },
      {
        name: 'Google Cloud Storage',
        inputs: [
          { name: 'Storage_GB', label: 'Storage (GB)', type: 'number' },
          { name: 'Data_transfer_out_GB', label: 'Data Transfer Out (GB)', type: 'number' },
          { name: 'Operations_class_A', label: 'Class A Operations', type: 'number' },
          { name: 'Operations_class_B', label: 'Class B Operations', type: 'number' },
          { name: 'Region', label: 'Region', type: 'text' },
        ],
      },
      {
        name: 'Google Cloud CDN',
        inputs: [
          { name: 'Cache_egress_GB', label: 'Cache Egress (GB)', type: 'number' },
          { name: 'HTTP_requests', label: 'HTTP Requests', type: 'number' },
          { name: 'Region', label: 'Region', type: 'text' },
          { name: 'Cache_fill_GB', label: 'Cache Fill (GB)', type: 'number' },
        ],
      },
      {
        name: 'Google Cloud Load Balancing',
        inputs: [
          { name: 'Forwarding_rules', label: 'Forwarding Rules', type: 'number' },
          { name: 'Data_processed_GB', label: 'Data Processed (GB)', type: 'number' },
          { name: 'Region', label: 'Region', type: 'text' },
          { name: 'Load_balancer_type', label: 'Load Balancer Type', type: 'text' },
        ],
      },
      {
        name: 'MongoDB Atlas',
        inputs: [
          { name: 'Cluster_tier', label: 'Cluster Tier', type: 'text' },
          { name: 'Storage_GB', label: 'Storage (GB)', type: 'number' },
          { name: 'Data_transfer_out_GB', label: 'Data Transfer Out (GB)', type: 'number' },
          { name: 'Region', label: 'Region', type: 'text' },
          { name: 'Backup_usage', label: 'Backup Usage', type: 'text' },
        ],
      },
      {
        name: 'Vercel',
        inputs: [
          { name: 'Build_execution_minutes', label: 'Build Execution Minutes', type: 'number' },
          { name: 'Bandwidth_GB', label: 'Bandwidth (GB)', type: 'number' },
          { name: 'Serverless_invocations', label: 'Serverless Invocations', type: 'number' },
          { name: 'Team_seats', label: 'Team Seats', type: 'number' },
          { name: 'Plan_type', label: 'Plan Type', type: 'text' },
        ],
      },
      {
        name: 'Ably',
        inputs: [
          { name: 'Connection_hours', label: 'Connection Hours', type: 'number' },
          { name: 'Messages', label: 'Messages', type: 'number' },
          { name: 'Peak_connections', label: 'Peak Connections', type: 'number' },
          { name: 'Channels', label: 'Channels', type: 'number' },
          { name: 'Plan_type', label: 'Plan Type', type: 'text' },
        ],
      },
      {
        name: 'Agora',
        inputs: [
          { name: 'Audio_minutes', label: 'Audio Minutes', type: 'number' },
          { name: 'Video_HD_minutes', label: 'Video HD Minutes', type: 'number' },
          { name: 'Video_720p_minutes', label: 'Video 720p Minutes', type: 'number' },
          { name: 'Users', label: 'Users', type: 'number' },
        ],
      },
      {
        name: 'Mixpanel',
        inputs: [
          { name: 'Events', label: 'Events', type: 'number' },
          { name: 'User_profiles', label: 'User Profiles', type: 'number' },
          { name: 'Reports', label: 'Reports', type: 'number' },
          { name: 'Sessions', label: 'Sessions', type: 'number' },
          { name: 'Plan_type', label: 'Plan Type', type: 'text' },
        ],
      },
      {
        name: 'Segment',
        inputs: [
          { name: 'MTUs', label: 'MTUs', type: 'number' },
          { name: 'Connections', label: 'Connections', type: 'number' },
          { name: 'Destinations', label: 'Destinations', type: 'number' },
          { name: 'Users', label: 'Users', type: 'number' },
          { name: 'Plan_type', label: 'Plan Type', type: 'text' },
        ],
      },
      {
        name: 'Resend',
        inputs: [
          { name: 'Emails_sent', label: 'Emails Sent', type: 'number' },
          { name: 'Contacts', label: 'Contacts', type: 'number' },
          { name: 'Domains', label: 'Domains', type: 'number' },
          { name: 'API_calls', label: 'API Calls', type: 'number' },
        ],
      },
      {
        name: 'ElevenLabs Speech to Text',
        inputs: [
          { name: 'Audio_seconds', label: 'Audio Seconds', type: 'number' },
          { name: 'Model_type', label: 'Model Type', type: 'text' },
          { name: 'Language', label: 'Language', type: 'text' },
          { name: 'API_calls', label: 'API Calls', type: 'number' },
        ],
      },
      {
        name: 'OpenAI Whisper Text to Speech',
        inputs: [
          { name: 'Characters_processed', label: 'Characters Processed', type: 'number' },
          { name: 'Model_type', label: 'Model Type', type: 'text' },
          { name: 'API_calls', label: 'API Calls', type: 'number' },
        ],
      },
      {
        name: 'Unity Cloud',
        inputs: [
          { name: 'Users', label: 'Users', type: 'number' },
          { name: 'Storage_GB', label: 'Storage (GB)', type: 'number' },
          { name: 'Build_numbers', label: 'Build Minutes', type: 'number' },
          { name: 'Projects', label: 'Projects', type: 'number' },
        ],
      },
      {
        name: 'Unreal Engine',
        inputs: [
          { name: 'Custom_license', label: 'Custom License', type: 'text' },
          { name: 'Users', label: 'Users', type: 'number' },
          { name: 'Revenue_share', label: 'Revenue Share', type: 'number' },
          { name: 'Projects', label: 'Projects', type: 'number' },
        ],
      },
      {
        name: 'Suno AI',
        inputs: [
          { name: 'Songs_generated', label: 'Songs Generated', type: 'number' },
          { name: 'Credits', label: 'Credits', type: 'number' },
          { name: 'Plan_type', label: 'Plan Type', type: 'text' },
        ],
      },
      {
        name: 'Leonardo AI',
        inputs: [
          { name: 'Image_generations', label: 'Image Generations', type: 'number' },
          { name: 'Credits', label: 'Credits', type: 'number' },
          { name: 'Model_type', label: 'Model Type', type: 'text' },
          { name: 'Plan_type', label: 'Plan Type', type: 'text' },
        ],
      },
    ];

    await providersCollection.deleteMany({});
    await providersCollection.insertMany(providers);
    console.log('Providers inserted successfully');
  } catch (error) {
    console.error('Error inserting providers:', error);
  } finally {
    await client.close();
  }
}

insertProviders();