<script>
	// AAA-Raymond: the Resources page is our redesign (link cards + news feed with source filters). The template's
	// Resources and News components are no longer used here.
	import RayResources from '$lib/AAA-Raymond/components/RayResources/index.svelte';

	export let data;
</script>

<RayResources articlesData={data.articlesData} />
