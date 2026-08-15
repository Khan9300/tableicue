### Architecture Design Document: Real-Time Streaming Data Framework

#### 1\. Strategic Transition: From Batch Processing to Real-Time Streams

In the current landscape of high-stakes, user-facing applications, the shift from legacy batch ETL to real-time streaming is a non-negotiable business imperative. Legacy architectures create a "Data Stall"—a critical failure state where the UI presents a reality that no longer exists, forcing users to make decisions based on the "ghosts of data." For a competitive SaaS platform, such as a disruptor in the document signature space, these delays result in missed opportunities, destroyed efficiencies, and the "Pain Harold" user experience of watching a dashboard lag while high-velocity business events pass by.

##### Architectural Evaluation: Legacy vs. Real-Time Mandates

Modern systems must abandon traditional BI architectures, which were designed for internal reporting rather than high-concurrency user features.| Metric | Legacy Batch/BI Architecture | Real-Time Streaming Architecture || \------ | \------ | \------ || **Batch ETL Intervals** | Periodic (Hourly/Daily); high "Data Stall" risk | Near-instantaneous (Seconds old) || **Query Latency** | Seconds to minutes; high lag | Sub-50ms (Optimized for concurrency) || **User Concurrency** | Limited; fails under high load | Highly scalable; serves many concurrent viewers || **Data Freshness** | Stale; relies on snapshots | Up-to-the-second analytical accuracy || **Storage Model** | General-purpose row-based | Optimized columnar storage |  
To eliminate these structural bottlenecks, the architecture mandates a specialized tech stack capable of transitioning raw events into actionable insights in milliseconds.

#### 2\. Core Real-Time Data Platform: The Tinybird Ingestion Tier

The architecture leverages a real-time data platform to offload the "undifferentiated heavy lifting" of infrastructure management. The ingestion tier is responsible for capturing high-velocity event streams (e.g., document sent, signed, or received) and providing an immediate analytical foundation.

##### Architectural Components of Ingestion

* **Tinybird Events API:**  An HTTP streaming endpoint that captures events directly from the application and writes them instantly to the data source.  
* **Kafka Connector:**  Facilitates real-time analytics over existing Kafka topics for event-driven backends.  
* **Managed ClickHouse Backend:**  This tier leverages a columnar base optimized for sub-second analytics. Strategically, this allows the system to perform complex analytical joins at the point of ingestion without the performance degradation typical of row-based systems.By plugging in data and shipping in minutes, we reduce time-to-market for data-rich features. We eliminate the need for manual indexing and partitioning typical of traditional configurations, allowing the focus to remain on structural data management.

#### 3\. Transformation Layer: SQL-Based Processing Pipes

The transformation layer mandates the use of "Pipes"—a Directed Acyclic Graph (DAG) of SQL nodes. This modular approach replaces monolithic, unmaintainable queries with composable logic designed for performance and scale.

##### The Mechanics of Pipes and Nodes

A Pipe breaks complex transformations into chained SQL nodes. For instance, a node may join high-velocity data from signatures.datasource with a more static accounts.datasource.

* **Individual Node Profiling:**  By breaking queries into nodes, we can profile performance at a granular level, identifying and resolving bottlenecks before they reach production.  
* **Dynamic Query Logic:**  We utilize the Tinybird templating language to handle interactive user inputs, such as {% if defined %} blocks and dynamic date parameters.

\-- Example: Dynamic logic for organization-level metrics  
SELECT   
    account\_id,  
    {% if defined(completed) %}  
        countIf(status \= 'completed') as total  
    {% else %}  
        count() as total  
    {% end %}  
FROM signatures  
WHERE  
    fromUnixTimestamp64Milli(timestamp)  
    BETWEEN {{ Date(date\_from, '2023-01-01') }}  
    AND {{ Date(date\_to, '2024-01-01') }}  
GROUP BY account\_id

This DAG-based structure ensures that transformations remain maintainable even as business logic evolves.

#### 4\. Service Layer: High-Concurrency REST APIs

Automatically deployed REST APIs are the mandated delivery method for user-facing features. Every Pipe is published as a low-latency endpoint capable of scaling to thousands of concurrent users.

##### API Deployment and Security Mandates

Security must be categorized by the consumption context:

* **Internal Orchestration (Admin Tokens):**  High-privilege access for management only.  **Warning:**  These must never be exposed to the client side.  
* **Client-Side Consumption (JWT/Read Tokens):**  JSON Web Tokens (JWTs) are the architectural standard for user-specific data isolation and Row-Level Security (RLS) in SaaS environments.

##### Self-Aware UI via Latency Metadata

The architecture requires that every JSON response includes latency metadata. This allows the frontend to monitor its own performance in real time. By receiving sub-50ms responses, the application maintains high User Concurrency without performance degradation, ensuring a responsive experience for all viewers.

#### 5\. Visualization Layer: Next.js and Tremor Integration

The visualization layer must bring data to life through a responsive, high-performance interface. The goal is to minimize "Time-to-Insight" for the end user.

##### Frontend Architecture

* **Next.js & Network Boundaries:**  The "Use Client" directive is mandated to define a clear network boundary. This allows the UI to stay responsive while background polling logic handles the Tinybird API calls.  
* **Tremor Components:**  Pre-built library components are used for rapid deployment of sophisticated dashboards (e.g., "Signature Count by Organization").  
* **Data Polling:**  The system utilizes a polling pattern to fetch the latest metrics, ensuring the "real-time" vibe is maintained visually.Leveraging "vibe coding" with AI-assisted tools and Tremor allows for the construction of professional-grade dashboards in under an hour, accelerating the iteration cycle.

#### 6\. Implementation Use Case: Real-Time Tournament Management

In high-stakes environments like amateur sports (e.g., APA pool leagues), this architecture handles complex handicapping and event-driven orchestration.

##### The Equalizer® System and Applied Score

To prevent "sandbagging," the transformation layer handles the proprietary formula (innings \- safeties) / win.

* **The Applied Score Mandate:**  If a player wins but their performance (innings-per-win) is statistically inconsistent with their skill level, the architecture ignores raw data. It enforces an "Applied Score" based on their winning percentage. This is a critical "check and balance" to protect the integrity of the competitive landscape.

##### Event-Driven Orchestration

For "Chip Tournament" formats—where losers lose a chip and winners stay at the table—the system operates in  **"Auto-pilot mode"** :

1. **Match Assignment:**  Winners remain at the table; newcomers are pulled from the top of the "Players Up Next" queue.  
2. **Queue Management:**  Losers are automatically moved to the bottom of the "Up Next" list.  
3. **Push Notifications:**  The framework triggers "Match Ready" alerts as soon as a table is cleared.

#### 7\. Development Workflow and Lifecycle Management

To support zero-downtime iterations, the architecture mandates a robust Developer Experience (DX) utilizing the Tinybird CLI and sophisticated branching strategies.

##### The CI/CD Lifecycle

* **Rapid Prototyping:**  We utilize tb mock for schema-first development, allowing the UI to be built before the real data stream is live. tb sql is used for immediate data validation.  
* **Branches and Zero-Copy Environments:**  We mandate the use of Branches to test new features against production-scale data volumes without the cost or risk of cloning the physical database.  
* **Schema Iteration:**  Structural data changes must be performed with zero downtime to prevent service interruptions for active users.This framework transforms raw event streams into a professional technical blueprint, providing a high-performance "speed layer" that turns data into a strategic asset.

