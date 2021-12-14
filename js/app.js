class SearchInput {


    AUTOCOMPLETION_ENDPOINT = "https://timetable.search.ch/api/completion.fr.json?term="

    /**
     *
     * @param {HTMLInputElement} input
     * @param {HTMLDivElement} dropdown
     */
    constructor(input, dropdown) {
        this.input = input
        this.dropdown = dropdown

        this.input.addEventListener("focus", () => {
            if(this.dropdown.childElementCount > 0) {
                this.dropdown.classList.add("show")
            }
        })

        this.input.addEventListener("keydown",  async (e) => {
            if(this.input.value.length > 1) {
                await this.updateList(this.input.value)
                this.dropdown.classList.add("show")
            }
        })

        this.input.addEventListener("blur", () => {
            setTimeout(() => {
                this.dropdown.classList.remove("show")
            }, 100)
        })
    }


    async updateList(termSearch)
    {
        let response = await fetch(this.AUTOCOMPLETION_ENDPOINT + termSearch)
        let result = await response.json()
        result = result.slice(0, 4)
        this.dropdown.innerHTML = ""

        result.forEach(v => {
            this.dropdown.append(this.suggestionElement(v.label))
        })
    }

    suggestionElement(label)
    {

        let li = document.createElement("li")
        let a = document.createElement("a")
        a.classList.add("dropdown-item")
        a.href = "#"
        a.textContent = label
        li.append(a)

        li.addEventListener("click", (e) => {
            e.preventDefault()
            this.input.value = label
        })

        return li

    }



    getValue(){
        return this.input.value
    }




}

class FindRelation {

    API_ENDPOINT = "https://timetable.search.ch/api/route.fr.json"

    TYPE_ICONS = {
        post: `<img src="../assets/pictos/bus.svg" alt="Type de transport: bus"/>`,
        train: `<img src="../assets/pictos/train.svg"  alt="Type de transport: train"/>`,
        walk: `<img src="../assets/icons/walk.svg"  alt="Type de transport: à pied"/>`,
    }

    params = {
        from: null,
        to: null
    }

    /**
     * @param {HTMLButtonElement} button
     * @param {SearchInput} fromInput
     * @param {SearchInput} toInput
     * @param resultCount
     */
    constructor(button, fromInput, toInput, resultCount) {
        this.fromInput = fromInput
        this.toInput = toInput
        this.resultCount = resultCount

        button.addEventListener("click", this.handleClick)
    }

    setParams() {
        this.params.from = this.fromInput.getValue()
        this.params.to = this.toInput.getValue()
    }

    handleClick = async (e) => {
        e.preventDefault()
        this.setParams()
        await this.search()
    }


    async search() {
        let response = await fetch(this.API_ENDPOINT + this.queryString())
        let result = await response.json()
        this.useObject(result)
    }

    useObject(json) {

        if(!json.connections){
            let noResult = strToDom(`<div class="accordion-item">
            <h2 class="accordion-header">
              <span class="accordion-button collapsed d-flex align-items-center" type="button">
                Aucun résultat pour votre recherche
              </span>
            </h2>
          </div>`)

            document.querySelector("#accordion").append(noResult)
            return
        }

        document.querySelector("#accordion").innerHTML = ""
        json.connections.forEach(v => {
            this.getConnection(v)
        })

    }

    getConnection(connection)
    {
        let departure = new Date(connection.departure)
        let arrival = new Date(connection.arrival)

        let o = strToDom(`<div class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed d-flex align-items-center" type="button">
                <span class="material-icons-round mx-2">train</span>
                ${departure.toLocaleTimeString('fr-CH')} - ${arrival.toLocaleTimeString('fr-CH')}
              </button>
            </h2>
            <div class="accordion-collapse collapse">
              <div class="accordion-body">
                
              </div>
            </div>
          </div>`)

        let accBody = o.querySelector(".accordion-body")
        connection.legs.forEach(leg => {
            accBody.append(this.getStep(leg).nextSibling)
        })

        o.querySelector("button").addEventListener("click", (e) => {
            Array.from(document.querySelectorAll(".accordion-collapse")).forEach(el => {
                el.classList.remove("show")
            })
            o.querySelector(".accordion-collapse").classList.toggle("show")
        })

        document.querySelector("#accordion").append(o)

    }


    getStep(step)
    {
        let departure = new Date(step.departure ?? step.arrival)

        let track = ""
        let line = ""
        let exit = null;

        if(step.track){
            track = `<span class="text-muted">Voie ${step.track}</span>`

        }
        if(step.line){
            line = `<span class="badge text-light" style="background-color: #${step.bgcolor}">${step.line}</span>`

        }

        if(step.exit) {
            let exitTrack = ""
            if(step.exit.track){
                exitTrack = `<span class="text-muted">Voie ${step.exit.track}</span>`
            }

            let arrival = new Date(step.exit.arrival)
            exit = `
<div class="d-flex justify-content-between">
    <h6 class="mb-0"><span class="badge bg-primary text-light font-monospace">${arrival.toLocaleTimeString()}</span> ${step.exit.name}</h6>
    ${exitTrack}
</div>
            `
        }

        return strToDom(`
<div class="p-2 bg-light mb-2">
    <div class="d-flex justify-content-between ${exit ? 'mb-2' : '' }">
        <h6 class="mb-0"><span class="badge bg-primary text-light font-monospace">${departure.toLocaleTimeString()}</span> ${line} ${step.name}</h6>
        ${track}
    </div>
    ${exit ?? ''}
</div>
`)
    }

    queryString() {
        return `?from=${this.params.from}&to=${this.params.to}`
    }

}

function strToDom(str) {
    return document.createRange().createContextualFragment(str).firstChild;
}

const $resultCount = document.querySelector("#result-count")
const $fromInput = document.querySelector("#from")
const $toInput = document.querySelector("#to")
const $button = document.querySelector("#search")
const $fromSuggest = document.querySelector("#from-suggest")
const $toSuggest = document.querySelector("#to-suggest")
let from = new SearchInput($fromInput, $fromSuggest)
let to = new SearchInput($toInput, $toSuggest)
/**
 * @param {HTMLButtonElement} button
 */
function activeButton(button) {
    button.removeAttribute("disabled")
    button.classList.remove("btn-light")
    button.classList.add("btn-primary")
}
/**
 * @param {HTMLButtonElement} button
 */
function inactiveButton(button) {
    button.setAttribute("disabled", "true")
    button.classList.add("btn-light")
}

let search = new FindRelation($button, from, to, $resultCount)


