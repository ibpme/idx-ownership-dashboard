package main

type ConglomerateGroup struct {
	ID       string
	Name     string
	Patterns []string
}

var conglomerateGroups = []ConglomerateGroup{
	{
		ID:       "prajogo",
		Name:     "Prajogo Pangestu",
		Patterns: []string{"PRAJOGO PANGESTU", "BARITO"},
	},
	{
		ID:       "salim",
		Name:     "Salim Group",
		Patterns: []string{"ANTHONI SALIM", "INDOFOOD"},
	},
	{
		ID:       "sinarmas",
		Name:     "Sinar Mas",
		Patterns: []string{"SINAR MAS", "FRANKY OESMAN WIDJAJA"},
	},
	{
		ID:       "jardine",
		Name:     "Jardine / Astra",
		Patterns: []string{"ASTRA INTERNATIONAL", "JARDINE CYCLE"},
	},
	{
		ID:       "thohir",
		Name:     "Thohir / Adaro",
		Patterns: []string{"GARIBALDI THOHIR", "ADARO STRATEGIC", "ALAMTRI"},
	},
	{
		ID:       "saratoga",
		Name:     "Soeryadjaya / Saratoga",
		Patterns: []string{"EDWIN SOERYADJAYA", "SARATOGA INVESTAMA"},
	},
	{
		ID:       "bakrie",
		Name:     "Bakrie Group",
		Patterns: []string{"BAKRIE"},
	},
	{
		ID:       "mnc",
		Name:     "MNC Group",
		Patterns: []string{"HARY TANOESOEDIBJO", "PT MNC", "MNC "},
	},
	{
		ID:       "panin",
		Name:     "Panin Group",
		Patterns: []string{"PANINKORP", "PANINVEST", "PANIN FINANCIAL"},
	},
	{
		ID:       "ciputra",
		Name:     "Ciputra Group",
		Patterns: []string{"CIPUTRA"},
	},
	{
		ID:       "danantara",
		Name:     "Government / SOE (Danantara)",
		Patterns: []string{"PERUSAHAAN PERSEROAN (PERSERO) PT DANANTARA"},
	},
	{
		ID:       "lippo",
		Name:     "Lippo Group",
		Patterns: []string{"LIPPO", "DEWI VICTORIA RIADY", "GRACE DEWI RIADY", "MATAHARI DEPARTMENT"},
	},
	{
		ID:       "ctcorp",
		Name:     "CT Corp",
		Patterns: []string{"CT CORPORA", "MEGA CORPORA"},
	},
	{
		ID:       "djoko",
		Name:     "Djoko Susanto",
		Patterns: []string{"DJOKO SUSANTO", "SUMBER ALFARIA"},
	},
	{
		ID:       "mayapada",
		Name:     "Mayapada",
		Patterns: []string{"MAYAPADA"},
	},
	{
		ID:       "agungsedayu",
		Name:     "Agung Sedayu",
		Patterns: []string{"AGUNG SEDAYU", "AGUNG PODOMORO"},
	},
	{
		ID:       "pakuwon",
		Name:     "Wiwoho / Pakuwon",
		Patterns: []string{"PAKUWON"},
	},
	{
		ID:       "emtek",
		Name:     "Emtek / Sariaatmadja",
		Patterns: []string{"SARIAATMADJA", "ELANG MAHKOTA"},
	},
}
